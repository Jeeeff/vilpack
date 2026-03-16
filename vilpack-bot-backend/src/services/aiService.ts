import Groq from 'groq-sdk';
import prisma from "../config/prisma";
import { leadCaptureService } from "./leadCaptureService";

// Initialize the Groq SDK
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

// Retry com backoff exponencial para erros 429 do Groq
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGroqWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota') || err?.message?.includes('rate_limit');
      if (is429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
        console.warn(`[GROQ] Rate limit (429). Aguardando ${delay}ms antes da tentativa ${attempt + 2}/${maxRetries + 1}...`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Groq: máximo de tentativas atingido');
}

/**
 * Detecta quais categorias o cliente mencionou na mensagem atual.
 * Usa correspondência simples de substrings (sem IA, custo zero).
 */
function detectMentionedCategories(message: string, categoryNames: string[]): string[] {
  const lower = message.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove acentos para comparação

  return categoryNames.filter(cat => {
    const catNorm = cat.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Verifica se alguma palavra da categoria (≥4 chars) aparece na mensagem
    const words = catNorm.split(/\s+/).filter(w => w.length >= 4);
    return words.some(w => lower.includes(w)) || lower.includes(catNorm);
  });
}

export const aiService = {
  async generateSellerResponse(sessionId: string, message: string) {
    try {
      // 🔎 Busca ou cria sessão automaticamente
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

      // ⚡ INTERCEPTAÇÃO DO "START" — antes de qualquer query de produto
      if (message.toLowerCase() === 'start') {
        return "Oi! Sou a Vick da Vilpack 😊 Qual tipo de embalagem você está precisando?";
      }

      // 📂 Busca apenas as CATEGORIAS disponíveis (query leve, sempre roda)
      const categories = await prisma.category.findMany({
        where: { storeId: session.storeId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      const categoryNames = categories.map(c => c.name);
      const categoryList = categoryNames.map(c => `  • ${c}`).join('\n');

      // 🔍 Detecta se o cliente mencionou alguma categoria (custo zero — só string match)
      const mentioned = detectMentionedCategories(message, categoryNames);

      // Também verifica histórico recente (últimas 4 mensagens do usuário) para contexto
      const recentUserMessages = await prisma.message.findMany({
        where: { sessionId, role: 'user' },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { content: true },
      });
      const recentText = recentUserMessages.map(m => m.content).join(' ');
      const mentionedFromHistory = detectMentionedCategories(recentText, categoryNames);

      // União: categorias mencionadas agora OU nas últimas 4 mensagens
      const relevantCats = [...new Set([...mentioned, ...mentionedFromHistory])];

      // 📦 Busca produtos SOMENTE das categorias relevantes (query seletiva)
      let productSection = '';
      if (relevantCats.length > 0) {
        const relevantProducts = await prisma.product.findMany({
          where: {
            active: true,
            category: {
              name: { in: relevantCats },
              storeId: session.storeId,
            },
          },
          include: { category: true },
          orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
          take: 40, // máx 40 produtos mesmo com muitas categorias
        });

        const grouped: Record<string, string[]> = {};
        for (const p of relevantProducts) {
          const cat = p.category?.name ?? 'Geral';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(p.name);
        }

        productSection = '\n\nPRODUTOS DISPONÍVEIS (categorias solicitadas):\n' +
          Object.entries(grouped)
            .map(([cat, items]) => `[${cat}]\n${items.map(i => `  • ${i}`).join('\n')}`)
            .join('\n\n');

        console.log(`[AI] Injetando ${relevantProducts.length} produtos de: ${relevantCats.join(', ')}`);
      } else {
        console.log(`[AI] Sem categoria detectada — prompt só com lista de categorias`);
      }

      // 🧠 PROMPT BASE — só categorias + regras (tokens fixos ~300)
      const systemPrompt = `Você é a Vick, consultora da Vilpack — empresa de embalagens.
Seja DIRETA, AMIGÁVEL e BREVE. Máximo 3 frases por resposta, salvo ao listar produtos.

REGRAS:
- Nunca invente produtos. Use apenas os listados abaixo.
- Preços são enviados pelo WhatsApp — nunca cite valores.
- Não repita informações que o cliente já deu.
- Prefira listas curtas a parágrafos longos.

FLUXO:
1. Pergunte o nome (se não souber).
2. Pergunte qual categoria de produto o cliente busca.
3. Se a categoria tiver muitos produtos, pergunte o tipo/subcategoria antes de listar tudo.
4. Liste os produtos específicos (máx. 5 por vez).
5. Quando o cliente demonstrar interesse, peça o WhatsApp para orçamento.

CATEGORIAS DISPONÍVEIS:
${categoryList}${productSection}

HANDOFF — quando tiver nome + interesse + WhatsApp, use EXATAMENTE:
### [RESUMO_FINAL]
- **Cliente:** [Nome]
- **WhatsApp:** [Telefone]
- **Segmento:** [Ramo]
- **Interesse:** [Produtos]
---
"Perfeito! Passando para nosso time agora. Em breve entrarão em contato!"`;

      // 📜 Busca histórico de mensagens (últimas 16 — suficiente e econômico)
      const history = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 16,
      });

      const historyContents = history.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const contents = [
        {
          role: 'user',
          parts: [{ text: systemPrompt + '\n\nEntendeu?' }],
        },
        {
          role: 'model',
          parts: [{ text: 'Entendido. Sou a Vick da Vilpack — direta, amigável e breve.' }],
        },
        ...historyContents,
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ];

       // 🤖 Chamada da IA com retry automático em caso de 429
       const reply = await callGroqWithRetry(async () => {
         // Converte histórico do formato Gemini para formato OpenAI (compatível com Groq)
         const groqHistory: any[] = contents.slice(0, -1).map((msg: any) => ({
           role: msg.role === 'model' ? 'assistant' : 'user',
           content: msg.parts[0].text,
         }));

         const response = await groq.chat.completions.create({
           model: 'llama-3.3-70b-versatile',
           messages: [
             ...groqHistory,
             { role: 'user' as const, content: message },
           ],
           temperature: 0.7,
           max_tokens: 300,
         });

         return response.choices[0]?.message?.content || '';
       });

      if (!reply) throw new Error('Resposta vazia da IA');

      // 🧠 CAPTURA DE LEAD HÍBRIDA (Determinística + IA sob demanda)
      try {
        const deterministicData = leadCaptureService.extractDeterministicData(message);
        const aiLeadData = await leadCaptureService.extractAiData(sessionId, message, reply);
        await leadCaptureService.updateLead(sessionId, deterministicData, aiLeadData);
      } catch (e: any) {
        console.warn(`[CHAT_LEAD_FALLBACK] Falha silenciosa na captura: ${e.message}`);
      }

      // 💾 Salva mensagens no banco
      await prisma.$transaction([
        prisma.message.create({ data: { sessionId, role: 'user', content: message } }),
        prisma.message.create({ data: { sessionId, role: 'assistant', content: reply } }),
      ]);

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
    });
  },
};
