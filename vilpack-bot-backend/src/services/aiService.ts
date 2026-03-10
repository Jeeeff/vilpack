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

      // 🔎 Busca sessão
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          store: true,
        },
      });

      if (!session) {
        throw new Error("Sessão não encontrada");
      }

      // 🛍 Busca produtos da loja
      const products = await prisma.product.findMany({
        where: {
          category: {
            storeId: session.storeId,
          },
          active: true,
        },
      });

      console.log("Produtos encontrados:", products.length);

      // 📦 Formata produtos para o prompt
      const formattedProducts = products
        .map(
          (p) =>
            `- ${p.name} (R$ ${Number(p.price).toFixed(2)}) ${
              p.description ? "- " + p.description : ""
            } ${p.imageUrl ? `[Imagem: ${p.imageUrl}]` : ""}`
        )
        .join("\n");

      // 🧠 PROMPT PROFISSIONAL (VIK 3.1 - CONSULTORA PREMIUM)
      const systemPrompt = `
Você é a Vik, a consultora comercial sênior da Vilpack.
Sua missão é transformar visitantes em leads qualificados através de uma consultoria de embalagens sofisticada.

**Diretrizes de Atendimento:**
1.  **Reconhecimento de Contexto:** Se o cliente já informou o nome, use-o com naturalidade. Se já informou o segmento (ex: "tenho uma padaria"), não pergunte novamente; use essa informação para sugerir soluções específicas para padarias.
2.  **Tom de Voz:** Premium, técnico mas acessível, e focado em Branding. Embalagem não é apenas custo, é investimento em marca.
3.  **Captura Progressiva:**
    - Fase 1 (Conexão): Obter o nome.
    - Fase 2 (Diagnóstico): Entender o segmento e o que o cliente busca (ex: sacolas, papel acoplado, caixas).
    - Fase 3 (Solução): Recomendar produtos do catálogo abaixo.
    - Fase 4 (Conversão): Obter WhatsApp/Email para envio de catálogo completo e orçamento.
4.  **Handoff Humano:** Quando o cliente demonstrar intenção clara de compra ou solicitar contato humano, diga que está preparando os dados para um consultor especialista e peça o contato se ainda não tiver.

🛒 **Catálogo Vilpack Disponível:**
${formattedProducts}

📜 **Regras de Ouro:**
- **NÃO seja repetitiva.** 
- **NÃO use "Olá!" em todas as frases.** Seja fluida.
- **Responda de forma concisa no início.** Deixe o cliente falar.
- **Foco em WhatsApp:** O canal principal de fechamento da Vilpack é o WhatsApp.

Se o cliente quiser um orçamento formal, use o marcador:
### [RESUMO_FINAL]
*   **Consultora:** Vik
*   **Cliente:** [Nome]
*   **WhatsApp:** [Telefone]
*   **Segmento:** [Segmento]
*   **Interesse:** [Produtos]
---
*Vik: "Estou enviando seus dados agora mesmo para nossa equipe comercial. Em instantes você receberá nossa proposta premium!"*
`;

      // ⚡ INTERCEPTAÇÃO DO "START"
      if (message.toLowerCase() === 'start') {
         return "Olá! Eu sou a Vik, a assistente virtual da Vilpack. Como posso ajudar você a encontrar a embalagem perfeita hoje?";
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
          parts: [{ text: "Sim, entendi. Sou a Vik, a consultora de vendas da Vilpack e seguirei essas diretrizes." }],
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

      // 🧠 CAPTURA DE LEAD HÍBRIDA (Determinística + IA)
      try {
        // Camada 1: Regex
        const deterministicData = leadCaptureService.extractDeterministicData(message);
        
        // Camada 2: IA Estruturada
        const aiLeadData = await leadCaptureService.extractAiData(sessionId, message, reply);
        
        // Persistência/Update
        await leadCaptureService.updateLead(sessionId, deterministicData, aiLeadData);
      } catch (e) {
        console.error("Erro no fluxo de captura de lead:", e);
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
