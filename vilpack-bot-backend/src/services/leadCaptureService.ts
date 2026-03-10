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

    // Normalização de Email
    const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) data.email = emailMatch[0].toLowerCase();

    // Normalização de WhatsApp/Phone (Apenas números, remove 55 se vier com DDD)
    let phoneDigits = message.replace(/\D/g, '');
    if (phoneDigits.length >= 10) {
      if (phoneDigits.startsWith('55') && phoneDigits.length > 11) {
        phoneDigits = phoneDigits.substring(2);
      }
      data.whatsapp = phoneDigits;
    }

    // Padrões simples de nome: "meu nome é [Nome]", "me chame de [Nome]"
    const nameMatch = message.match(/(?:meu nome é|me chame de|sou o|sou a)\s+([a-zA-ZÀ-ÿ]+)/i);
    if (nameMatch && nameMatch[1].length > 2) {
      data.name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
    }

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
   * Calcula o score do lead baseado nos campos preenchidos e contexto.
   */
  calculateScore(lead: any): { score: number; status: string } {
    let score = 0;
    
    if (lead.name) score += 10;
    if (lead.segment) score += 15;
    if (lead.interestSummary || lead.productsOfInterest) score += 20;
    if (lead.whatsapp) score += 25;
    if (lead.email) score += 15;
    
    // Bônus por intenção clara (detectada pela IA no status)
    if (lead.status === 'WAITING_HUMAN' || lead.status === 'QUALIFIED') score += 15;

    let status = 'NEW';
    if (score >= 75) status = 'WAITING_HUMAN';
    else if (score >= 50) status = 'QUALIFIED';
    else if (score >= 25) status = 'ENGAGED';

    return { score: Math.min(score, 100), status };
  },

  /**
   * Gera um resumo comercial automático via IA.
   */
  async generateCommercialSummary(sessionId: string, lead: any): Promise<string | null> {
    try {
      const summaryPrompt = `
Gere um resumo comercial curto e operacional para o time de vendas.
Dados do Lead:
- Nome: ${lead.name || 'Não informado'}
- Segmento: ${lead.segment || 'Não informado'}
- Necessidade: ${lead.interestSummary || 'Não detalhada'}
- Produtos citados: ${lead.productsOfInterest || 'Nenhum'}
- WhatsApp: ${lead.whatsapp ? 'Sim' : 'Não'}
- Email: ${lead.email ? 'Sim' : 'Não'}

Formato: "Cliente [Nome], atua em [Segmento], busca [Necessidade]. [Produtos]. Contato: [Wpp/Email]. Próximo passo: [Ação]."
`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(summaryPrompt);
      return result.response.text().trim();
    } catch (error) {
      console.error("Erro ao gerar resumo comercial:", error);
      return null;
    }
  },

  /**
   * Sincroniza os dados extraídos com o banco de dados de forma incremental.
   */
  async updateLead(sessionId: string, deterministicData: Partial<ExtractedLeadData>, aiData: ExtractedLeadData | null) {
    try {
      // 1. Busca lead atual para não sobrescrever dados válidos
      const currentLead = await prisma.lead.findUnique({
        where: { sessionId },
        include: { summary: true }
      });

      const mergedData = {
        ...aiData,
        ...deterministicData, // Regex tem prioridade em campos exatos
      };

      // 2. Lógica de "Não Sobrescrever Válido por Vazio"
      const updateData: any = {};
      
      const fields: (keyof ExtractedLeadData)[] = ['name', 'whatsapp', 'email', 'segment', 'companyName', 'interestSummary', 'status'];
      
      fields.forEach(field => {
        if (mergedData[field] && (!currentLead || !currentLead[field as keyof typeof currentLead])) {
          updateData[field] = mergedData[field];
        }
      });

      // Tratamento especial para produtos (acumulativo)
      if (mergedData.productsOfInterest) {
        const newProducts = Array.isArray(mergedData.productsOfInterest) 
          ? mergedData.productsOfInterest.join(', ') 
          : mergedData.productsOfInterest;
        
        if (!currentLead?.productsOfInterest) {
          updateData.productsOfInterest = newProducts;
        } else if (newProducts && !currentLead.productsOfInterest.includes(newProducts)) {
          updateData.productsOfInterest = `${currentLead.productsOfInterest}, ${newProducts}`;
        }
      }

      // 3. Upsert Inicial/Dados Básicos
      const lead = await prisma.lead.upsert({
        where: { sessionId },
        create: {
          sessionId,
          name: updateData.name || null,
          whatsapp: updateData.whatsapp || null,
          email: updateData.email || null,
          segment: updateData.segment || null,
          companyName: updateData.companyName || null,
          interestSummary: updateData.interestSummary || null,
          productsOfInterest: updateData.productsOfInterest || null,
          status: updateData.status || "NEW",
          qualificationScore: 0,
          lastInteractionAt: new Date(),
        },
        update: {
          ...updateData,
          lastInteractionAt: new Date(),
        },
      });

      // 4. Recalcular Score e Status
      const { score, status } = this.calculateScore(lead);
      
      // 5. Gerar Resumo se houver dados mínimos (Score > 20)
      let aiSummary = null;
      if (score > 20) {
        aiSummary = await this.generateCommercialSummary(sessionId, lead);
      }

      // 6. Persistência Final do Score e Resumo
      return await prisma.lead.update({
        where: { id: lead.id },
        data: {
          qualificationScore: score,
          status: status, // Sobrescreve status sugerido pela IA pelo status calculado por score
          summary: aiSummary ? {
            upsert: {
              create: { summary: aiSummary, lastAiUpdateAt: new Date() },
              update: { summary: aiSummary, lastAiUpdateAt: new Date() }
            }
          } : undefined
        }
      });

    } catch (error) {
      console.error("Erro crítico na persistência do lead:", error);
      return null;
    }
  },

  async getLeadBySession(sessionId: string) {
    return await prisma.lead.findUnique({
      where: { sessionId },
      include: { summary: true }
    });
  }
};
