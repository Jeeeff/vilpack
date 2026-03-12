import prisma from "../config/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from 'crypto';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Configurações de Hardening (Produção 2026)
const EXTRACTION_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutos entre extrações de IA
const MIN_SCORE_FOR_SUMMARY = 50; // Score mínimo para gerar briefing (era 30)
const MIN_MESSAGE_LENGTH = 8;     // Mensagens muito curtas não disparam IA

// Palavras-chave que indicam conteúdo relevante para extração de lead
const RELEVANT_KEYWORDS = [
  'nome', 'chamo', 'sou', 'empresa', 'cnpj', 'whatsapp', 'telefone', 'celular',
  'email', '@', 'segmento', 'padaria', 'restaurante', 'loja', 'mercado',
  'quero', 'preciso', 'interessado', 'comprar', 'orçamento', 'quantidade',
  'pedido', 'contato', 'falar', 'humano', 'vendedor', 'consultor'
];

const hasRelevantContent = (msg: string): boolean => {
  const lower = msg.toLowerCase();
  return RELEVANT_KEYWORDS.some(kw => lower.includes(kw));
};

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
   * Camada 1: Extração Determinística (Regex) - Custo Zero e Alta Confiabilidade
   */
  extractDeterministicData(message: string): Partial<ExtractedLeadData> {
    const data: Partial<ExtractedLeadData> = {};

    // 1. E-mail (Case Insensitive)
    const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      data.email = emailMatch[0].toLowerCase();
      console.log(`[LEAD_REGEX] E-mail detectado: ${data.email}`);
    }

    // 2. WhatsApp/Telefone (Normalização para Padrão Brasileiro 11 dígitos)
    let phoneDigits = message.replace(/\D/g, '');
    if (phoneDigits.length >= 10) {
      if (phoneDigits.startsWith('55') && phoneDigits.length > 11) {
        phoneDigits = phoneDigits.substring(2);
      }
      data.whatsapp = phoneDigits;
      console.log(`[LEAD_REGEX] Telefone detectado: ${data.whatsapp}`);
    }

    // 3. Nome (Padrões Explícitos)
    const nameMatch = message.match(/(?:meu nome é|me chame de|sou o|sou a)\s+([a-zA-ZÀ-ÿ]+)/i);
    if (nameMatch && nameMatch[1].length > 2) {
      data.name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
      console.log(`[LEAD_REGEX] Nome detectado: ${data.name}`);
    }

    return data;
  },

  /**
   * Gera um hash do contexto atual para cache de extração.
   */
  generateContextHash(sessionId: string, userMessage: string, history: any[]): string {
    const contextString = sessionId + userMessage + history.map(h => h.content).join('');
    return crypto.createHash('md5').update(contextString).digest('hex');
  },

  /**
   * Camada 2: Extração por IA (Híbrida) - Acionada Apenas sob Demanda
   */
  async extractAiData(sessionId: string, userMessage: string, assistantReply: string): Promise<ExtractedLeadData | null> {
    try {
      // 1. Busca Lead e Histórico para avaliar necessidade de disparo
      const [currentLead, history] = await Promise.all([
        prisma.lead.findUnique({ where: { sessionId } }),
        prisma.message.findMany({
          where: { sessionId },
          orderBy: { createdAt: "asc" },
          take: 5, // Contexto curto para economia
        })
      ]);

      // 2. GATILHOS INTELIGENTES (Hardening Step 1)
      const contextHash = this.generateContextHash(sessionId, userMessage, history);
      
      // Regra 1: Cache de Contexto (Evita reprocessar se nada mudou)
      if (currentLead?.lastLeadContextHash === contextHash) {
        console.log(`[LEAD_IA] Pulando extração: Contexto idêntico detectado (Hash: ${contextHash})`);
        return null;
      }

      // Regra 2: Cooldown Temporal (Evita bombardeio de requisições 429)
      const now = new Date();
      if (currentLead?.lastLeadExtractionAt) {
        const diff = now.getTime() - currentLead.lastLeadExtractionAt.getTime();
        if (diff < EXTRACTION_COOLDOWN_MS) {
          console.log(`[LEAD_IA] Pulando extração: Cooldown ativo (${Math.round((EXTRACTION_COOLDOWN_MS - diff)/1000)}s restantes)`);
          return null;
        }
      }

      // Regra 3: Relevância da Mensagem (Filtro de Ruído reforçado)
      if (
        userMessage.length < MIN_MESSAGE_LENGTH ||
        ["ok", "sim", "não", "vlw", "obrigado", "blz", "ok!", "tudo bem", "oi", "ola", "olá"].includes(userMessage.toLowerCase().trim()) ||
        !hasRelevantContent(userMessage)
      ) {
        console.log(`[LEAD_IA] Pulando extração: Mensagem sem conteúdo relevante para lead.`);
        return null;
      }

      console.log(`[LEAD_IA] Iniciando extração Gemini para sessão ${sessionId}...`);

      const extractionPrompt = `
Extraia dados comerciais estruturados da conversa entre Consultora (Vick) e Cliente.
Retorne APENAS JSON. Use null para campos não encontrados.

Campos:
- name: Nome próprio.
- whatsapp: Apenas números.
- email: E-mail válido.
- segment: Ramo de atuação (ex: Padaria, Restaurante).
- companyName: Nome da empresa.
- interestSummary: Breve resumo do que busca.
- status: NEW, ENGAGED, QUALIFIED ou WAITING_HUMAN.
- qualificationScore: Inteiro 0-100.

Histórico Recente:
        ${history.map(m => `${m.role === 'user' ? 'Cliente' : 'Vick'}: ${m.content}`).join('\n')}
Cliente (última): ${userMessage}
Vik (resposta): ${assistantReply}
`;

      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const result = await model.generateContent(extractionPrompt);
      const data = this.extractJson(result.response.text());

      // Atualiza metadados de controle
      await prisma.lead.update({
        where: { sessionId },
        data: {
          lastLeadExtractionAt: now,
          lastLeadContextHash: contextHash
        }
      });
      
      return data;
    } catch (error: any) {
      console.error("[LEAD_IA] Erro na extração Gemini:", error.message);
      // Fallback: Retorna null para não quebrar o chat principal
      return null;
    }
  },

  /**
   * Extrai JSON com suporte a blocos markdown.
   */
  extractJson(text: string): any {
    try {
      return JSON.parse(text);
    } catch (e) {
      const cleanJson = text.replace(/```json|```/g, "").trim();
      try {
        return JSON.parse(cleanJson);
      } catch (innerError) {
        console.warn("[LEAD_IA] Falha no parse de JSON da IA.");
        return null;
      }
    }
  },

  /**
   * Sincroniza dados com persistência resiliente.
   */
  async updateLead(sessionId: string, deterministicData: Partial<ExtractedLeadData>, aiData: ExtractedLeadData | null) {
    try {
      const currentLead = await prisma.lead.findUnique({
        where: { sessionId },
        include: { summary: true }
      });

      // Merge inteligente: Prioridade para Determinístico (Regex) em campos exatos
      const mergedData = {
        ...aiData,
        ...deterministicData,
      };

      const updateData: any = {};
      const fields: (keyof ExtractedLeadData)[] = ['name', 'whatsapp', 'email', 'segment', 'companyName', 'interestSummary', 'status'];
      
      fields.forEach(field => {
        const newValue = mergedData[field];
        const currentValue = currentLead ? (currentLead as any)[field] : null;

        if (newValue && newValue !== currentValue) {
          if (field === 'status') {
            const statusOrder = ['NEW', 'ENGAGED', 'QUALIFIED', 'WAITING_HUMAN'];
            const currentIndex = statusOrder.indexOf(currentValue || 'NEW');
            const newIndex = statusOrder.indexOf(newValue as string);
            if (newIndex > currentIndex) updateData[field] = newValue;
          } else {
            updateData[field] = newValue;
          }
        }
      });

      // 3. Upsert Base
      const lead = await prisma.lead.upsert({
        where: { sessionId },
        create: {
          sessionId,
          ...updateData,
          lastInteractionAt: new Date(),
        },
        update: {
          ...updateData,
          lastInteractionAt: new Date(),
        },
      });

      // 4. Score e Briefing
      const { score, status, priority } = this.calculateScore(lead);

      // Calcula score anterior para detectar mudança de faixa
      const previousScore = currentLead?.qualificationScore ?? 0;
      const crossedThreshold =
        (previousScore < 50 && score >= 50) ||
        (previousScore < 75 && score >= 75);

      let aiSummary = null;
      // Gera resumo apenas quando cruzar uma faixa de score E score for relevante
      if (score >= MIN_SCORE_FOR_SUMMARY && crossedThreshold) {
        aiSummary = await this.generateCommercialSummary(sessionId, lead);
      }

      return await prisma.lead.update({
        where: { id: lead.id },
        data: {
          qualificationScore: score,
          status,
          priority,
          isRead: false,
          summary: aiSummary ? {
            upsert: {
              create: { summary: aiSummary, lastAiUpdateAt: new Date() },
              update: { summary: aiSummary, lastAiUpdateAt: new Date() }
            }
          } : undefined
        }
      });

    } catch (error) {
      console.error("[LEAD_PERSISTENCE] Erro crítico:", error);
      return null;
    }
  },

  calculateScore(lead: any): { score: number; status: string; priority: string } {
    let score = 0;
    if (lead.name) score += 10;
    if (lead.segment) score += 15;
    if (lead.interestSummary) score += 20;
    if (lead.whatsapp) score += 25;
    if (lead.email) score += 15;
    if (lead.status === 'WAITING_HUMAN' || lead.status === 'QUALIFIED') score += 15;

    let status = 'NEW';
    let priority = 'LOW';
    if (score >= 75) { status = 'WAITING_HUMAN'; priority = 'URGENT'; }
    else if (score >= 50) { status = 'QUALIFIED'; priority = 'HIGH'; }
    else if (score >= 25) { status = 'ENGAGED'; priority = 'MEDIUM'; }

    return { score: Math.min(score, 100), status, priority };
  },

  async generateCommercialSummary(sessionId: string, lead: any): Promise<string | null> {
    try {
      const summaryPrompt = `
Gere um BRIEFING COMERCIAL para a Vilpack:
- Cliente: ${lead.name || 'Não identificado'}
- Segmento: ${lead.segment || 'Não identificado'}
- Interesse: ${lead.interestSummary || 'Não detalhado'}
- Contato: ${lead.whatsapp || lead.email || 'Aguardando'}
- Score: ${lead.qualificationScore}/100

FORMATO:
👤 CLIENTE: [Nome]
🏢 SEGMENTO: [Ramo]
🎯 INTERESSE: [O que busca]
🔥 STATUS: [Frio/Morno/Quente]
🚀 AÇÃO: [Próximo passo]
`;
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const result = await model.generateContent(summaryPrompt);
      return result.response.text().trim();
    } catch (error) {
      console.warn("[LEAD_SUMMARY] Falha ao gerar resumo.");
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
