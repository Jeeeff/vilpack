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

      // 🧠 PROMPT PROFISSIONAL
      const systemPrompt = `
Você é a Vik, a assistente virtual inteligente e simpática da Vilpack.
Você deve se comunicar no gênero feminino, com um tom profissional, acolhedor e focado em ajudar o cliente a encontrar a embalagem ideal.
Seu objetivo é entender a necessidade do cliente e oferecer a solução ideal, não apenas listar produtos.

🛒 **Catálogo de Produtos Disponíveis:**
${formattedProducts}

📜 **Diretrizes de Comportamento:**
1.  **Abordagem Consultiva:** Aja como um vendedor humano experiente. Seja cordial, profissional e prestativo.
2.  **Regra do Funil (IMPORTANTE):** Se o cliente pedir uma categoria genérica (ex: "preciso de sacolas"), **NÃO liste todos os produtos de uma vez**.
    *   Pergunte primeiro: "Temos vários modelos (plástica, papel, reciclada). Qual tipo ou tamanho você procura?" ou "Para qual finalidade seria?".
    *   Somente após o cliente especificar, mostre as opções relevantes.
3.  **Exibição de Produtos:** Quando apresentar produtos específicos, inclua SEMPRE a imagem no formato Markdown:
    *   Exemplo: \`![Nome do Produto](URL_DA_IMAGEM)\`
    *   Mostre também o preço e uma breve descrição.
4.  **Upsell Inteligente:** Sugira complementos lógicos (ex: se pedir caixa de pizza, ofereça papel acoplado ou lacre).
5.  **Honestidade:** Nunca invente produtos. Se não tiver algo, sugira uma alternativa do catálogo ou diga que não trabalha com isso.
6.  **Fechamento (OBRIGATÓRIO):**
    *   **Qualificação:** Após o cliente demonstrar intenção de compra (escolher produto/quantidade), você **DEVE** perguntar o **Nome** e o **WhatsApp** dele antes de fechar.
    *   **Resumo Final:** Assim que o cliente fornecer os dados, gere um resumo da compra.
    *   **Marcador de Sistema:** O bloco do resumo final DEVE iniciar com a tag \`### [RESUMO_FINAL]\`.
    *   **Formato do Resumo:**
        ### [RESUMO_FINAL]
        *   **Cliente:** [Nome]
        *   **WhatsApp:** [Telefone]
        *   **Pedido:**
            *   [Qtd]x [Produto] - R$ [Preço Unit]
            *   ...
        *   **Total:** R$ [Valor Total]

Lembre-se: Você é a Vik. Converse com o cliente.
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
          parts: [{ text: "Sim, entendi. Sou o consultor de vendas da Vilpack e seguirei essas diretrizes." }],
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
      // Fallback message if AI fails, but user wants to fix it, so rethrow to debug if needed
      // or return a friendly error. User said "Tratar erro corretamente" and "Retornar resposta limpa".
      // If I throw, the controller catches it.
      // But maybe I should return a fallback here? 
      // "Não entregue parcialmente." -> "Garanta que IA responde".
      // So I should throw so the error handler can log it, or handle it here.
      // I'll throw to let the global error handler deal with it or the controller.
      throw error;
    }
  },
};
