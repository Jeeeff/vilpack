/**
 * salesNotificationService — envia notificações automáticas para o WhatsApp
 * da equipe de vendas quando a Vick gera um resumo ou a sessão fica inativa.
 *
 * Completamente isolado: não depende de featureFlags do painel WhatsApp,
 * não altera banco, não interfere no fluxo do SmartChat público.
 *
 * Env vars necessárias (todas opcionais — sem elas o serviço fica silencioso):
 *   SALES_NOTIFICATIONS_ENABLED=true
 *   SALES_WHATSAPP_NUMBER=5511999990000   ← número da equipe (só dígitos)
 *   EVOLUTION_BASE_URL=http://...
 *   EVOLUTION_API_KEY=...
 *   EVOLUTION_INSTANCE_NAME=vilpack
 */

import axios from 'axios';
import prisma from '../config/prisma';

// ── config ─────────────────────────────────────────────────────────────────────

const ENABLED        = process.env.SALES_NOTIFICATIONS_ENABLED === 'true';
const SALES_NUMBER   = (process.env.SALES_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');
const BASE_URL       = process.env.EVOLUTION_BASE_URL ?? '';
const API_KEY        = process.env.EVOLUTION_API_KEY ?? '';
const INSTANCE       = process.env.EVOLUTION_INSTANCE_NAME ?? 'vilpack';

/** Minutos sem nova mensagem para disparar notificação de inatividade */
const INACTIVITY_MINUTES = Number(process.env.SALES_INACTIVITY_MINUTES ?? '15');

// ── in-memory dedup ────────────────────────────────────────────────────────────

/**
 * Conjunto de sessionIds que já receberam notificação neste ciclo de vida
 * do processo. Evita notificações duplicadas sem precisar de coluna no banco.
 * Reinicia se o container reiniciar — comportamento aceitável.
 */
const notifiedSessions = new Set<string>();

// ── helpers ────────────────────────────────────────────────────────────────────

function isReady(): boolean {
  if (!ENABLED)       { return false; }
  if (!SALES_NUMBER)  { console.warn('[salesNotif] SALES_WHATSAPP_NUMBER não configurado'); return false; }
  if (!BASE_URL)      { console.warn('[salesNotif] EVOLUTION_BASE_URL não configurado');    return false; }
  if (!API_KEY)       { console.warn('[salesNotif] EVOLUTION_API_KEY não configurado');     return false; }
  return true;
}

async function sendViaEvolution(text: string): Promise<void> {
  await axios.post(
    `${BASE_URL}/message/sendText/${INSTANCE}`,
    { number: SALES_NUMBER, text },
    { headers: { apikey: API_KEY }, timeout: 10_000 },
  );
}

/** Extrai o bloco [RESUMO_FINAL] da resposta da Vick (sem o marcador) */
function extractSummaryBlock(reply: string): string | null {
  const idx = reply.indexOf('[RESUMO_FINAL]');
  if (idx === -1) return null;
  return reply.slice(idx + '[RESUMO_FINAL]'.length).trim();
}

/** Formata a transcrição de uma sessão para envio */
function formatTranscript(
  messages: { role: string; content: string; createdAt: Date }[],
): string {
  return messages
    .map((m) => {
      const who  = m.role === 'user' ? '👤 Cliente' : '🤖 Vick';
      const time = m.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `${who} [${time}]\n${m.content}`;
    })
    .join('\n\n');
}

// ── public API ─────────────────────────────────────────────────────────────────

export const salesNotificationService = {
  /**
   * Chamado pelo aiService sempre que a Vick retorna uma resposta.
   * Se a resposta contiver [RESUMO_FINAL], envia imediatamente para a equipe.
   */
  async onResumoFinal(sessionId: string, reply: string): Promise<void> {
    if (!isReady()) return;
    if (notifiedSessions.has(sessionId)) return; // já notificou esta sessão

    const block = extractSummaryBlock(reply);
    if (!block) return; // não é um resumo

    notifiedSessions.add(sessionId);

    const text = [
      '🔔 *Novo lead via chat Vick*',
      '',
      block
        .replace(/^#+\s*/gm, '')         // remove marcadores markdown de título
        .replace(/\*\*(.*?)\*\*/g, '*$1*'), // converte **negrito** → *negrito* (WA style)
      '',
      `_(sessão: ${sessionId.slice(0, 8)}…)_`,
    ].join('\n');

    try {
      await sendViaEvolution(text);
      console.log(`[salesNotif] Resumo enviado para a equipe — sessão ${sessionId.slice(0, 8)}`);
    } catch (err: any) {
      // Falha silenciosa — nunca quebra o fluxo do chat
      console.warn(`[salesNotif] Falha ao enviar resumo: ${err?.message}`);
    }
  },

  /**
   * Chamado pelo job de inatividade a cada minuto.
   * Busca sessões com mensagens mas sem atividade há INACTIVITY_MINUTES minutos
   * e que ainda não foram notificadas — envia a transcrição resumida.
   */
  async checkInactiveSessions(): Promise<void> {
    if (!isReady()) return;

    const cutoff = new Date(Date.now() - INACTIVITY_MINUTES * 60 * 1000);

    // Sessões com última mensagem antes do cutoff
    const staleSessions = await prisma.session.findMany({
      where: {
        updatedAt: { lt: cutoff },
        messages:  { some: {} }, // tem pelo menos uma mensagem
      },
      select: {
        id:       true,
        messages: {
          orderBy: { createdAt: 'asc' },
          select:  { role: true, content: true, createdAt: true },
        },
        lead: {
          select: { name: true, whatsapp: true, segment: true },
        },
      },
      take: 20, // processa no máximo 20 por ciclo
    });

    for (const session of staleSessions) {
      if (notifiedSessions.has(session.id)) continue;
      if (session.messages.length === 0)    continue;

      // Só notifica se não houver resumo já na conversa (evita duplo disparo
      // quando o [RESUMO_FINAL] disparou o trigger imediato acima)
      const hasResumo = session.messages.some(
        (m) => m.role === 'assistant' && m.content.includes('[RESUMO_FINAL]'),
      );
      if (hasResumo) {
        notifiedSessions.add(session.id); // marca para não processar mais
        continue;
      }

      notifiedSessions.add(session.id);

      const transcript = formatTranscript(session.messages);
      const leadInfo   = session.lead
        ? `👤 ${session.lead.name ?? 'Sem nome'} | 📱 ${session.lead.whatsapp ?? '?'} | 🏢 ${session.lead.segment ?? '?'}`
        : '_(lead não capturado ainda)_';

      const text = [
        `⏰ *Conversa inativa (${INACTIVITY_MINUTES} min) — sem fechamento*`,
        '',
        leadInfo,
        '',
        '*Transcrição:*',
        transcript,
        '',
        `_(sessão: ${session.id.slice(0, 8)}…)_`,
      ].join('\n');

      try {
        await sendViaEvolution(text);
        console.log(`[salesNotif] Inatividade enviada para a equipe — sessão ${session.id.slice(0, 8)}`);
      } catch (err: any) {
        console.warn(`[salesNotif] Falha ao enviar inatividade: ${err?.message}`);
        notifiedSessions.delete(session.id); // volta ao pool para tentar de novo
      }
    }
  },
};
