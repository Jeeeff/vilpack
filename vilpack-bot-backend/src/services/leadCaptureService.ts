import prisma from "../config/prisma";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export interface ExtractedLeadData {
  name?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  segment?: string | null;
  companyName?: string | null;
  interestSummary?: string | null;
  productsOfInterest?: string[] | null;
  status?: string | null;
  qualificationScore?: number | null;
}

export const leadCaptureService = {
  /**
   * Camada 1: Extração Determinística (Regex)
   * Extrai dados óbvios da mensagem do usuário antes de processar via IA.
   */
  extractDeterministicData(message: string): Partial<ExtractedLeadData> {
    const data: Partial<ExtractedLeadData> = {};

    // Email Regex
    const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) data.email = emailMatch[0];

    // WhatsApp/Phone Regex (Padrão brasileiro simples)
    const phoneMatch = message.replace(/\D/g, '').match(/(?:\d{2})?9\d{8}/);
    if (phoneMatch) data.whatsapp = phoneMatch[0];

    // Padrões simples de nome: "meu nome é [Nome]", "me chame de [Nome]"
    const nameMatch = message.match(/(?:meu nome é|me chame de|sou o|sou a)\s+([a-zA-ZÀ-ÿ]+)/i);
    if (nameMatch) data.name = nameMatch[1];

    return data;
  },

  /**
   * Camada 2: Extração por IA (Híbrida)
   * Usa o contexto da conversa para identificar informações implícitas.
   */
  async extractAiData(sessionId: string, userMessage: string, assistantReply: string): Promise<ExtractedLeadData | null> {
    try {
      const history = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
        take: 10,
      });

      const extractionPrompt = `
Extraia dados comerciais estruturados da conversa abaixo entre uma Consultora (Vik) e um Cliente.
Retorne APENAS um JSON válido. Use null para campos não encontrados.

Campos:
- name: Nome próprio da pessoa.
- whatsapp: Apenas números do telefone/whatsapp.
- email: Endereço de email válido.
- segment: Ramo de atuação (ex: Padaria, Hamburgueria, Loja de Roupas, E-commerce).
- companyName: Nome da empresa do cliente.
- interestSummary: Um breve resumo do que o cliente busca.
- productsOfInterest: Array de strings com nomes de produtos do catálogo citados.
- status: Classifique em NEW, ENGAGED, QUALIFIED ou WAITING_HUMAN.
- qualificationScore: Inteiro de 0 a 100 baseado na clareza da necessidade e dados fornecidos.

Conversa:
${history.map(m => `${m.role === 'user' ? 'Cliente' : 'Vik'}: ${m.content}`).join('\n')}
Cliente (última): ${userMessage}
Vik (resposta): ${assistantReply}
`;

      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const result = await model.generateContent(extractionPrompt);
      const data = JSON.parse(result.response.text());
      
      return data;
    } catch (error) {
      console.error("Erro na extração por IA:", error);
      return null;
    }
  },

  /**
   * Sincroniza os dados extraídos com o banco de dados.
   */
  async updateLead(sessionId: string, deterministicData: Partial<ExtractedLeadData>, aiData: ExtractedLeadData | null) {
    const mergedData = {
      ...aiData,
      ...deterministicData, // Regex tem prioridade em campos exatos como email/tel
    };

    // Remove campos nulos para não sobrescrever dados existentes com null
    const cleanData = Object.fromEntries(
      Object.entries(mergedData).filter(([_, v]) => v != null)
    );

    if (Object.keys(cleanData).length === 0) return null;

    return await prisma.lead.upsert({
      where: { sessionId },
      create: {
        sessionId,
        name: cleanData.name as string,
        whatsapp: cleanData.whatsapp as string,
        email: cleanData.email as string,
        segment: cleanData.segment as string,
        companyName: cleanData.companyName as string,
        interestSummary: cleanData.interestSummary as string,
        productsOfInterest: Array.isArray(cleanData.productsOfInterest) 
          ? cleanData.productsOfInterest.join(', ') 
          : cleanData.productsOfInterest as string,
        status: (cleanData.status as string) || "NEW",
        qualificationScore: (cleanData.qualificationScore as number) || 0,
        lastInteractionAt: new Date(),
      },
      update: {
        ...cleanData,
        productsOfInterest: Array.isArray(cleanData.productsOfInterest) 
          ? cleanData.productsOfInterest.join(', ') 
          : cleanData.productsOfInterest as string,
        lastInteractionAt: new Date(),
      },
    });
  },

  async getLeadBySession(sessionId: string) {
    return await prisma.lead.findUnique({
      where: { sessionId },
      include: { summary: true }
    });
  }
};
