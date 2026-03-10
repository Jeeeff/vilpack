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

      const response = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        config: {
          responseMimeType: "application/json"
        },
        contents: [
          { role: "user", parts: [{ text: extractionPrompt }] }
        ]
      });

      if (!response.text) {
        throw new Error("Resposta vazia da IA na extração");
      }

      const data = JSON.parse(response.text);
      
      return data;
    } catch (error) {
      console.error("Erro na extração por IA:", error);
      return null;
    }
  },

  /**
   * Calcula o score do lead baseado nos campos preenchidos e contexto.
   */
  calculateScore(lead: any): { score: number; status: string; priority: string } {
    let score = 0;
    
    if (lead.name) score += 10;
    if (lead.segment) score += 15;
    if (lead.interestSummary || lead.productsOfInterest) score += 20;
    if (lead.whatsapp) score += 25;
    if (lead.email) score += 15;
    
    // Bônus por intenção clara (detectada pela IA no status)
    if (lead.status === 'WAITING_HUMAN' || lead.status === 'QUALIFIED') score += 15;

    let status = 'NEW';
    let priority = 'LOW';

    if (score >= 75) {
      status = 'WAITING_HUMAN';
      priority = 'URGENT';
    } else if (score >= 50) {
      status = 'QUALIFIED';
      priority = 'HIGH';
    } else if (score >= 25) {
      status = 'ENGAGED';
      priority = 'MEDIUM';
    }

    return { score: Math.min(score, 100), status, priority };
  },

  /**
   * Gera um resumo comercial automático via IA.
   */
  async generateCommercialSummary(sessionId: string, lead: any): Promise<string | null> {
    try {
      const summaryPrompt = `
Gere um resumo comercial estratégico e operacional para o time de vendas da Vilpack.
Analise os dados abaixo e crie um briefing que ajude o vendedor a entender o valor do cliente e como abordá-lo.

Dados do Lead:
- Nome: ${lead.name || 'Não informado'}
- Segmento: ${lead.segment || 'Não informado'}
- Necessidade: ${lead.interestSummary || 'Não detalhada'}
- Produtos citados: ${lead.productsOfInterest || 'Nenhum'}
- WhatsApp: ${lead.whatsapp || 'Não informado'}
- Email: ${lead.email || 'Não informado'}
- Score de Qualificação: ${lead.qualificationScore}/100

Formato:
"O cliente [Nome], do segmento de [Segmento], demonstrou interesse em [Produtos]. A necessidade principal identificada foi [Necessidade]. O lead possui score [Score], sendo classificado como um potencial cliente [Temperatura: Frio/Morno/Quente]. Próximo passo sugerido: [Ação comercial direta]."

Seja conciso, profissional e use um tom de consultoria comercial.
`;

      const response = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          { role: "user", parts: [{ text: summaryPrompt }] }
        ]
      });

      if (!response.text) {
        throw new Error("Resposta vazia da IA no resumo");
      }

      return response.text.trim();
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
        const newValue = mergedData[field];
        const currentValue = currentLead ? (currentLead as any)[field] : null;

        // Se o novo valor existir e for diferente do atual, atualiza
        if (newValue && newValue !== currentValue) {
          // Se for status, só atualiza se for "mais avançado" (ex: de NEW para ENGAGED)
          if (field === 'status') {
            const statusOrder = ['NEW', 'ENGAGED', 'QUALIFIED', 'WAITING_HUMAN', 'CONVERTED', 'LOST'];
            const currentIndex = statusOrder.indexOf(currentValue || 'NEW');
            const newIndex = statusOrder.indexOf(newValue as string);
            if (newIndex > currentIndex) {
              updateData[field] = newValue;
            }
          } else {
            updateData[field] = newValue;
          }
        }
      });

      // Tratamento especial para produtos (acumulativo e sem duplicatas)
      if (mergedData.productsOfInterest) {
        const newProductsArray = Array.isArray(mergedData.productsOfInterest) 
          ? mergedData.productsOfInterest 
          : (mergedData.productsOfInterest as string).split(',').map(p => p.trim());
        
        const currentProductsArray = currentLead?.productsOfInterest 
          ? currentLead.productsOfInterest.split(',').map(p => p.trim()) 
          : [];

        const combinedProducts = Array.from(new Set([...currentProductsArray, ...newProductsArray]))
          .filter(p => p && p.length > 2);

        if (combinedProducts.length > currentProductsArray.length) {
          updateData.productsOfInterest = combinedProducts.join(', ');
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

      // 4. Recalcular Score, Status e Prioridade
      const { score, status, priority } = this.calculateScore(lead);
      
      // 5. Gerar Resumo se houver dados mínimos (Score > 20)
      let aiSummary = null;
      if (score > 20) {
        aiSummary = await this.generateCommercialSummary(sessionId, lead);
      }

      // 6. Persistência Final
      return await prisma.lead.update({
        where: { id: lead.id },
        data: {
          qualificationScore: score,
          status: status,
          priority: priority,
          isRead: false, // Nova interação torna o lead "não lido"
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
