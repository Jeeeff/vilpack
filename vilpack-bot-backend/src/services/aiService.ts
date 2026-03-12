import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../config/prisma";
import { leadCaptureService } from "./leadCaptureService";

// Initialize the Google Gen AI SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Utilizando modelos Gemini 2.0+ (padrão em 2026)


export const aiService = {
  async generateSellerResponse(sessionId: string, message: string) {
    try {
      console.log("GEMINI_API_KEY carregada?", !!process.env.GEMINI_API_KEY);

      // 🔎 Busca ou cria sessão automaticamente
      let session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          store: true,
        },
      });

      if (!session) {
        console.log(`[AI] Sessão não encontrada. Criando nova sessão: ${sessionId}`);
        
        // Busca ou cria loja padrão 'vilpack'
        let store = await prisma.store.findUnique({
          where: { slug: 'vilpack' },
        });

        if (!store) {
          console.log(`[AI] Loja 'vilpack' não encontrada. Criando...`);
          store = await prisma.store.create({
            data: {
              name: 'Vilpack',
              slug: 'vilpack',
              phoneNumber: '5511996113977', // Número da Vilpack
            }
          });
          console.log(`[AI] Loja 'vilpack' criada com sucesso.`);
        }

        // Cria nova sessão com o sessionId fornecido
        session = await prisma.session.create({
          data: {
            id: sessionId, // Usa o UUID fornecido pelo frontend
            storeId: store.id,
            cart: {
              create: {}
            }
          },
          include: {
            store: true,
            cart: true,
          }
        });
        
        console.log(`[AI] Nova sessão criada: ${sessionId} (Store: ${store.slug})`);
      }

      // 🛍 Busca produtos da loja com categoria
      const products = await prisma.product.findMany({
        where: {
          category: {
            storeId: session.storeId,
          },
          active: true,
        },
        include: { category: true },
        orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      });

      console.log("Produtos encontrados:", products.length);

      // 📦 Agrupa produtos por categoria para o prompt
      const grouped: Record<string, string[]> = {};
      for (const p of products) {
        const cat = p.category?.name ?? 'Geral';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p.name + (p.description ? ` (${p.description})` : ''));
      }
      const formattedProducts = Object.entries(grouped)
        .map(([cat, items]) => `[${cat}]\n${items.map(i => `  • ${i}`).join('\n')}`)
        .join('\n\n');

      // 🧠 PROMPT VICK 4.0 — RESPOSTAS CURTAS + AFUNILAMENTO POR SUBCATEGORIA
      const systemPrompt = `
Você é a Vick, consultora da Vilpack — empresa de embalagens.
Seja DIRETA, AMIGÁVEL e BREVE. Máximo 3 frases por resposta, salvo quando listar produtos.

REGRAS ABSOLUTAS:
- Nunca use parágrafos longos. Prefira listas curtas.
- Nunca repita informações que o cliente já deu.
- Nunca invente produtos fora do catálogo abaixo.
- Preços são passados pelo WhatsApp — nunca cite valores.
- Não use "Olá!" repetidamente. Seja natural.

FLUXO DE ATENDIMENTO (siga em ordem, sem pular etapas):
1. NOME — Se ainda não souber, pergunte o nome do cliente.
2. INTERESSE — Pergunte qual tipo de produto o cliente busca (ex: sacolas, caixas, papel).
3. AFUNILAMENTO — Se a categoria tiver muitos itens, pergunte a subcategoria. Exemplo:
   • "Temos sacolas lisas, recicláveis, personalizadas e para padaria. Qual te interessa?"
   Liste apenas os TIPOS existentes no catálogo para aquela categoria, não liste todos os produtos ainda.
4. PRODUTO — Depois de saber a subcategoria, liste os produtos específicos (máx. 5 por vez).
5. CONTATO — Quando o cliente demonstrar interesse, peça o WhatsApp para enviar orçamento.

CATÁLOGO VILPACK:
${formattedProducts}

HANDOFF: Quando tiver nome + interesse + WhatsApp, use EXATAMENTE este marcador:
### [RESUMO_FINAL]
- **Cliente:** [Nome]
- **WhatsApp:** [Telefone]
- **Segmento:** [Ramo do cliente]
- **Interesse:** [Produtos]
---
"Perfeito! Passando para nosso time agora. Em breve entrarão em contato!"
`;

      // ⚡ INTERCEPTAÇÃO DO "START"
      if (message.toLowerCase() === 'start') {
         return "Oi! Sou a Vick da Vilpack 😊 Qual tipo de embalagem você está precisando?";
      }

      // 📜 Busca histórico de mensagens
      const history = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
        take: 20, // Limita para não estourar tokens
      });

      // Formata histórico para o Gemini
      const historyContents = history.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      // Adiciona mensagem atual e System Prompt (via injeção no user message ou histórico)
      // Como fallback para compatibilidade de SDK, injetamos o System Prompt no início.
      const contents = [
        {
          role: "user",
          parts: [{ text: systemPrompt + "\n\nEntendeu sua missão?" }],
        },
        {
          role: "model",
          parts: [{ text: "Entendido. Sou a Vick da Vilpack — vou ser direta, amigável e breve, guiando o cliente pelo catálogo por etapas." }],
        },
        ...historyContents,
        {
          role: "user",
          parts: [{ text: message }],
        },
      ];

      // 🤖 Chamada da IA
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      // No @google/generative-ai, passamos o histórico como startChat
      const chat = model.startChat({
        history: contents.slice(0, -1), // Tudo exceto a última mensagem
        generationConfig: {
          temperature: 0.7,
        },
      });

      const result = await chat.sendMessage(message);
      const reply = result.response.text();

      if (!reply) {
        throw new Error("Resposta vazia da IA");
      }

      // 🧠 CAPTURA DE LEAD HÍBRIDA (Determinística + IA sob demanda)
      try {
        // Camada 1: Regex (Sempre roda, custo zero)
        const deterministicData = leadCaptureService.extractDeterministicData(message);
        
        // Camada 2: IA Estruturada (Gatilhos inteligentes e Cache interno)
        const aiLeadData = await leadCaptureService.extractAiData(sessionId, message, reply);
        
        // Persistência Resiliente
        await leadCaptureService.updateLead(sessionId, deterministicData, aiLeadData);
      } catch (e: any) {
        console.warn(`[CHAT_LEAD_FALLBACK] Falha silenciosa na captura: ${e.message}`);
      }

      // 💾 Salva mensagens no banco
      await prisma.$transaction([
        prisma.message.create({
          data: {
            sessionId,
            role: "user",
            content: message,
          },
        }),
        prisma.message.create({
          data: {
            sessionId,
            role: "assistant",
            content: reply,
          },
        }),
      ]);

      return reply;
    } catch (error: any) {
      console.error(
        "Erro completo na IA:",
        JSON.stringify(error, null, 2)
      );
      throw error;
    }
  },

  async getChatHistory(sessionId: string) {
    const history = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });
    return history;
  },
};
