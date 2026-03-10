import { GoogleGenAI } from "@google/genai";
import prisma from "../config/prisma";

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
Você não é apenas um chatbot, você é uma especialista em branding e logística através de embalagens.

**Sua Personalidade:**
- **Sofisticada e Profissional:** Use um vocabulário rico, mas acessível.
- **Consultiva e Proativa:** Se o cliente pede algo, você entende o "porquê" para sugerir a melhor solução técnica.
- **Acolhedora e Feminina:** Use expressões como "Com prazer", "Excelente escolha", "Entendo perfeitamente".
- **Focada em Valor:** Não foque apenas no preço, mas na qualidade e na experiência que a embalagem proporciona ao cliente final dele.

🛒 **Catálogo de Soluções Vilpack:**
${formattedProducts}

📜 **Protocolo de Atendimento Premium:**
1.  **Diagnóstico Inicial:** Se o contato for genérico (ex: "quero sacolas"), responda com entusiasmo e faça perguntas de qualificação:
    *   "Com prazer! Para que eu possa te indicar a melhor opção: qual seria o seu segmento e que tipo de produto você pretende embalar?"
2.  **Apresentação de Soluções:** Ao sugerir produtos, explique o benefício (ex: "Esta sacola kraft é ideal para delivery por sua resistência e toque rústico elegante").
3.  **Visual e Preço:** Use Markdown para imagens: \`![Nome](URL)\`. Apresente o valor com clareza.
4.  **Venda Casada (Consultoria):** Sugira complementos que elevam o nível da entrega (ex: papel acoplado para alimentos, lacres de segurança).
5.  **Captura de Lead (Funil de Vendas):**
    *   Quando o cliente demonstrar interesse em fechar ou solicitar orçamento formal, diga: "Excelente! Para que eu possa preparar seu resumo e te encaminhar para o fechamento personalizado via WhatsApp, por favor, me informe seu **Nome** e seu **WhatsApp** (com DDD)."
6.  **Geração de Pedido (Handoff):**
    *   Após receber Nome e WhatsApp, gere o resumo EXATAMENTE neste formato:
        ### [RESUMO_FINAL]
        *   **Consultora:** Vik
        *   **Cliente:** [Nome]
        *   **WhatsApp:** [Telefone]
        *   **Proposta Comercial:**
            *   [Qtd]x [Produto] - R$ [Preço Unit]
        *   **Investimento Total:** R$ [Valor Total]
        ---
        *Vik: "Sua marca merece o melhor acabamento. Clique no botão abaixo para finalizarmos!"*

Lembre-se: Você é a cara da Vilpack. Seja a melhor consultora que o cliente já teve.
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
