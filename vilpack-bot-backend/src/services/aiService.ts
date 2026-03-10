import { GoogleGenAI } from "@google/genai";
import prisma from "../config/prisma";
import { leadCaptureService } from "./leadCaptureService";

// Initialize the Google Gen AI SDK
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

// Force usage of v1 API if possible, or try another model name if needed.
// The SDK usually defaults to what is available.
// If v1beta fails for gemini-1.5-flash, maybe we need to specify the model version or use v1beta properly?
// Actually, gemini-1.5-flash should be available on v1beta.
// Maybe the key has no access?
// Or maybe the model needs to be `models/gemini-1.5-flash`?
// The new SDK usually takes just `gemini-1.5-flash`.


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

      // 🧠 PROMPT PROFISSIONAL (VIK - CONSULTORA PREMIUM)
      const systemPrompt = `
Você é a Vik, a consultora comercial sênior e especialista em embalagens da Vilpack.
Sua missão é realizar uma consultoria comercial completa e capturar leads qualificados de forma progressiva e natural.

**Sua Personalidade:**
- **Sofisticada e Profissional:** Use um vocabulário rico, mas acessível.
- **Consultiva e Proativa:** Entenda o "porquê" para sugerir a melhor solução técnica.
- **Acolhedora e Humana:** Use expressões como "Com prazer", "Excelente escolha", "Entendo perfeitamente".

🛒 **Catálogo de Soluções Vilpack:**
${formattedProducts}

🎯 **Protocolo Comercial de Captura Progressiva:**
1.  **Identificação (Nome):** Logo no início, peça o nome de forma leve: "Para que eu possa te atender de forma personalizada, como posso te chamar?".
2.  **Descoberta (Segmento/Necessidade):** Identifique o ramo do cliente: "Excelente, [Nome]. Qual o segmento do seu negócio? (ex: Padaria, Hamburgueria, Loja)".
3.  **Consultoria:** Recomende produtos baseados no segmento, focando em branding e valor.
4.  **Fechamento (WhatsApp/Email):** Quando houver interesse real ou pedido de orçamento, peça o contato: "Perfeito! Para facilitar o envio de orçamentos e catálogos, qual seu WhatsApp e e-mail?".

📜 **Regras de Ouro:**
- NÃO faça interrogatório. Peça um dado por vez.
- Se o usuário já informou algo espontaneamente, NÃO pergunte novamente.
- Use os dados coletados para personalizar a conversa (ex: use o nome do cliente).
- Continue ajudando mesmo se o usuário optar por não informar algum dado agora.

Geração de Pedido (Handoff):
- Se o cliente quiser fechar, gere o resumo EXATAMENTE neste formato:
    ### [RESUMO_FINAL]
    *   **Consultora:** Vik
    *   **Cliente:** [Nome]
    *   **WhatsApp:** [Telefone]
    *   **Proposta Comercial:**
        *   [Qtd]x [Produto] - R$ [Preço Unit]
    ---
    *Vik: "Sua marca merece o melhor acabamento. Clique no botão abaixo para finalizarmos!"*
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
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash", // Modelo disponível confirmado em 2026
        config: {
          temperature: 0.7,
        },
        contents: contents,
      });

      const reply = response.text;

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
