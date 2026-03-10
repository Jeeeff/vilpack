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
Sua missão é realizar uma consultoria comercial completa e capturar leads qualificados de forma progressiva e natural.

**Sua Personalidade:**
- **Sofisticada e Profissional:** Use um vocabulário rico, mas acessível.
- **Consultiva e Proativa:** Entenda o "porquê" para sugerir a melhor solução técnica.
- **Acolhedora e Feminina:** "Com prazer", "Excelente escolha", "Entendo perfeitamente".

🛒 **Catálogo de Soluções Vilpack:**
${formattedProducts}

🎯 **Estratégia de Captura Progressiva (NUNCA peça tudo de uma vez):**
1.  **Início (Nome):** Logo no começo, após a primeira resposta, peça o nome de forma leve: "Para que possamos conversar melhor, como posso te chamar?".
2.  **Qualificação (Segmento):** Descubra o ramo de atuação: "Excelente, [Nome]. Para te indicar a melhor embalagem, qual o seu segmento?".
3.  **Necessidade (Interesse):** Identifique o que ele precisa e sugira produtos do catálogo explicando o valor.
4.  **Contato (WhatsApp/Email):** Quando houver interesse real ou pedido de orçamento, peça o contato: "Perfeito! Para que eu possa te enviar o catálogo completo ou uma proposta formal, qual o seu melhor WhatsApp e e-mail?".

📜 **Regras de Comportamento:**
- Se o usuário já informou um dado, NÃO pergunte novamente.
- Use as informações coletadas para personalizar a conversa (chame pelo nome).
- Se faltar algo, retome depois com naturalidade.
- Se o cliente quiser fechar, gere o resumo final.

Geração de Pedido (Handoff):
- Após receber Nome e WhatsApp, gere o resumo EXATAMENTE neste formato:
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

      // 🧠 EXTRAÇÃO DE LEAD (Chamada secundária leve para estruturar dados)
      try {
        const leadExtractionPrompt = `
Extraia dados estruturados de Lead da conversa abaixo. 
Retorne APENAS um JSON válido. Se não encontrar o dado, retorne null.

Campos:
- name (nome do cliente)
- whatsapp (apenas números)
- email
- segment (segmento/ramo de atuação)
- companyName (nome da empresa se citado)
- interestSummary (resumo do que ele precisa)
- productsOfInterest (lista de produtos citados)
- status (NEW, ENGAGED, QUALIFIED, WAITING_HUMAN)
- qualificationScore (0-100 baseado no interesse e dados fornecidos)

Conversa:
${history.map(m => `${m.role}: ${m.content}`).join('\n')}
user: ${message}
model: ${reply}
`;

        const leadResult = await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          config: { temperature: 0, responseMimeType: "application/json" },
          contents: [{ role: "user", parts: [{ text: leadExtractionPrompt }] }]
        });

        const leadData = JSON.parse(leadResult.text);

        if (leadData) {
          await prisma.lead.upsert({
            where: { sessionId },
            create: {
              sessionId,
              name: leadData.name,
              whatsapp: leadData.whatsapp,
              email: leadData.email,
              segment: leadData.segment,
              companyName: leadData.companyName,
              interestSummary: leadData.interestSummary,
              productsOfInterest: Array.isArray(leadData.productsOfInterest) ? leadData.productsOfInterest.join(', ') : leadData.productsOfInterest,
              status: leadData.status || "NEW",
              qualificationScore: leadData.qualificationScore || 0,
              lastInteractionAt: new Date(),
            },
            update: {
              name: leadData.name || undefined,
              whatsapp: leadData.whatsapp || undefined,
              email: leadData.email || undefined,
              segment: leadData.segment || undefined,
              companyName: leadData.companyName || undefined,
              interestSummary: leadData.interestSummary || undefined,
              productsOfInterest: Array.isArray(leadData.productsOfInterest) ? leadData.productsOfInterest.join(', ') : leadData.productsOfInterest || undefined,
              status: leadData.status || undefined,
              qualificationScore: leadData.qualificationScore || undefined,
              lastInteractionAt: new Date(),
            }
          });
        }
      } catch (e) {
        console.error("Erro na extração de lead:", e);
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
