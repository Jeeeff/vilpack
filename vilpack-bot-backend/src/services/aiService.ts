import Groq from 'groq-sdk';
import prisma from "../config/prisma";
import { leadCaptureService } from "./leadCaptureService";
import { salesNotificationService } from "./salesNotificationService";
import {
  buildCategoryList,
  buildCategoryContext,
  detectKnowledgeCategories,
  detectByName,
  isDetailRequest,
} from "./vilpackKnowledge";

// ── Groq client ────────────────────────────────────────────────────────────────

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGroqWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 =
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('quota') ||
        err?.message?.includes('rate_limit');
      if (is429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
        console.warn(`[GROQ] Rate limit (429). Aguardando ${delay}ms — tentativa ${attempt + 2}/${maxRetries + 1}`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Groq: máximo de tentativas atingido');
}

// ── context builder ────────────────────────────────────────────────────────────

/**
 * Constrói o contexto de produto para o prompt usando as 3 camadas:
 *
 * CAMADA A — lista de categorias (sempre presente, vem do knowledge estático)
 * CAMADA B — resumo comercial das categorias detectadas (sem query no banco)
 * CAMADA C — nomes de produtos específicos do banco (só se cliente pede detalhe)
 *
 * Total de tokens do contexto: ~40 (A) + 80/cat (B) + 0–50 (C)
 */
async function buildProductContext(
  message: string,
  recentHistory: string,
  storeId: string,
): Promise<{ productContext: string; diagnostics: string }> {
  const combined = `${message} ${recentHistory}`;

  // CAMADA A — categorias (sempre, custo zero)
  const categoryList = buildCategoryList();

  // CAMADA B — detecta pelo knowledge estático (custo zero, amplo)
  const knowledgeHits = detectKnowledgeCategories(combined);

  // Fallback: detecta pelo nome das categorias no banco (compatibilidade)
  // Só corre se knowledge não pegou nada
  let dbCategoryNames: string[] = [];
  if (knowledgeHits.length === 0) {
    const dbCategories = await prisma.category.findMany({
      where: { storeId },
      select: { name: true },
    });
    dbCategoryNames = dbCategories.map(c => c.name);
    const dbHits = detectByName(combined, dbCategoryNames);
    if (dbHits.length > 0) {
      console.log(`[AI] Categoria detectada via DB fallback: ${dbHits.join(', ')}`);
    }
    // Quando só detecta via DB, não há resumo comercial — vai lista simples
    const productContext =
      `\n\nCATEGORIAS DISPONÍVEIS:\n${categoryList}`;
    return { productContext, diagnostics: `db-fallback:${dbHits.join(',')}` };
  }

  // Camada B — resumo comercial (sem banco)
  let context = buildCategoryContext(knowledgeHits);

  // CAMADA C — detalhe sob demanda (banco, só 5 produtos, só quando explicitamente pedido)
  if (isDetailRequest(combined) && knowledgeHits.length > 0) {
    const catNames = knowledgeHits.map(c => c.name);
    const detailProducts = await prisma.product.findMany({
      where: {
        active: true,
        category: { name: { in: catNames }, storeId },
      },
      select: { name: true, category: { select: { name: true } } },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      take: 5, // hard cap — nunca mais que 5 SKUs
    });

    if (detailProducts.length > 0) {
      const grouped: Record<string, string[]> = {};
      for (const p of detailProducts) {
        const cat = p.category?.name ?? 'Geral';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p.name);
      }
      context +=
        '\n\nOPÇÕES DISPONÍVEIS (detalhes solicitados):\n' +
        Object.entries(grouped)
          .map(([cat, items]) => `[${cat}]\n${items.map(i => `  • ${i}`).join('\n')}`)
          .join('\n\n');

      console.log(`[AI] Camada C ativa — ${detailProducts.length} SKUs injetados de: ${catNames.join(', ')}`);
    }
  }

  const productContext = `\n\nCATEGORIAS DISPONÍVEIS:\n${categoryList}${context}`;
  const diagnostics = `knowledge:${knowledgeHits.map(c => c.name).join(',')}`;
  return { productContext, diagnostics };
}

// ── main service ───────────────────────────────────────────────────────────────

export const aiService = {
  async generateSellerResponse(sessionId: string, message: string) {
    try {
      // Busca ou cria sessão automaticamente
      let session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { store: true },
      });

      if (!session) {
        let store = await prisma.store.findUnique({ where: { slug: 'vilpack' } });
        if (!store) {
          store = await prisma.store.create({
            data: { name: 'Vilpack', slug: 'vilpack', phoneNumber: '5511996113977' },
          });
        }
        session = await prisma.session.create({
          data: { id: sessionId, storeId: store.id, cart: { create: {} } },
          include: { store: true, cart: true },
        });
        console.log(`[AI] Nova sessão criada: ${sessionId}`);
      }

      // Fast path — mensagem de início (zero custo)
      if (message.toLowerCase() === 'start') {
        return "Oi! Sou a Vick da Vilpack 😊 Qual tipo de embalagem você está precisando?";
      }

      // Histórico recente (últimas 4 mensagens do usuário) para detecção de categoria
      const recentUserMessages = await prisma.message.findMany({
        where: { sessionId, role: 'user' },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { content: true },
      });
      const recentHistory = recentUserMessages.map(m => m.content).join(' ');

      // Constrói contexto em camadas (A/B/C)
      const { productContext, diagnostics } = await buildProductContext(
        message,
        recentHistory,
        session.storeId,
      );
      console.log(`[AI] Contexto: ${diagnostics}`);

      // System prompt limpo — usa role:system nativo do Groq (sem fake turn)
      const systemPrompt = `Você é a Vick, consultora comercial da Vilpack — empresa especializada em embalagens.
Seja DIRETA, AMIGÁVEL e MUITO BREVE. Máximo 2 frases curtas por resposta.

REGRAS OBRIGATÓRIAS:
- Nunca invente produtos, marcas ou especificações técnicas.
- Preços são enviados pelo time comercial pelo WhatsApp — nunca cite valores.
- Não repita informações que o cliente já forneceu.
- Respostas diretas. Sem parágrafos longos ou listas desnecessárias.
- Quando faltar contexto, faça UMA pergunta objetiva de cada vez.

FLUXO DE ATENDIMENTO:
1. Se não souber o nome, pergunte.
2. Identifique a categoria de embalagem que o cliente precisa.
3. Use o contexto comercial da categoria para orientar sem listar todos os produtos.
4. Se o cliente pedir detalhes específicos (tamanho, medida, modelo), apresente no máximo 3 opções.
5. Quando tiver nome + interesse + WhatsApp, faça o handoff.
${productContext}

HANDOFF — use EXATAMENTE este formato quando tiver nome + interesse + WhatsApp:
### [RESUMO_FINAL]
- **Cliente:** [Nome]
- **WhatsApp:** [Telefone]
- **Segmento:** [Ramo]
- **Interesse:** [Produtos]
---
"Ótimo! Clique no botão abaixo para falar agora com nosso time no WhatsApp e receber seu orçamento."`;

      // Histórico de conversa (últimas 12 mensagens — reduzido de 16)
      const history = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 12,
      });

      // Monta mensagens no formato Groq/OpenAI nativo
      const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...history.map(msg => ({
          role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: message },
      ];

      // Chamada Groq com retry em 429
      const reply = await callGroqWithRetry(async () => {
        const response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: chatMessages,
          temperature: 0.7,
          max_tokens: 150,
        });
        return response.choices[0]?.message?.content || '';
      });

      if (!reply) throw new Error('Resposta vazia da IA');

      // Captura de lead híbrida (determinística + IA sob demanda)
      try {
        const deterministicData = leadCaptureService.extractDeterministicData(message);
        const aiLeadData = await leadCaptureService.extractAiData(sessionId, message, reply);
        await leadCaptureService.updateLead(sessionId, deterministicData, aiLeadData);
      } catch (e: any) {
        console.warn(`[CHAT_LEAD_FALLBACK] Falha silenciosa na captura: ${e.message}`);
      }

      // Persiste mensagens
      await prisma.$transaction([
        prisma.message.create({ data: { sessionId, role: 'user', content: message } }),
        prisma.message.create({ data: { sessionId, role: 'assistant', content: reply } }),
      ]);

      // Notifica equipe de vendas se a Vick gerou um [RESUMO_FINAL] (fire-and-forget)
      salesNotificationService.onResumoFinal(sessionId, reply).catch(() => {});

      return reply;
    } catch (error: any) {
      console.error('Erro completo na IA:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  async getChatHistory(sessionId: string) {
    return prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  },
};
