/**
 * evolutionService — camada de integração com a Evolution API.
 * Centraliza TODAS as chamadas HTTP para a Evolution.
 * O frontend nunca fala diretamente com a Evolution.
 *
 * Erros são tipados e logados estruturadamente.
 * Nunca relança AxiosError cru para o controller — sempre converte para
 * EvolutionError com código semântico para facilitar diagnóstico.
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import { featureFlags } from '../config/featureFlags.js';

// ─── Tipos de erro estruturados ──────────────────────────────────────────────

export type EvolutionErrorCode =
  | 'PROVIDER_OFFLINE'      // Evolution API não respondeu (ECONNREFUSED, ENOTFOUND, timeout)
  | 'QR_NOT_AVAILABLE'      // Instância existe mas QR ainda não foi gerado
  | 'INSTANCE_NOT_FOUND'    // Instância não existe na Evolution (404)
  | 'AUTH_ERROR'            // API key inválida (401/403)
  | 'ALREADY_CONNECTED'     // Tentou gerar QR mas já está conectada
  | 'INVALID_RESPONSE'      // Evolution respondeu, mas payload inesperado
  | 'CONFIG_MISSING'        // EVOLUTION_BASE_URL ou EVOLUTION_API_KEY não definidos
  | 'UNKNOWN';              // Qualquer outro erro

export class EvolutionError extends Error {
  constructor(
    public readonly code: EvolutionErrorCode,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'EvolutionError';
  }
}

// ─── Logger interno ──────────────────────────────────────────────────────────

function log(level: 'info' | 'warn' | 'error', msg: string, extra?: object) {
  const ts = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️ ' : 'ℹ️ ';
  const line = `[evolutionService] ${prefix} ${msg}`;
  if (extra) {
    console[level](`${ts} ${line}`, JSON.stringify(extra));
  } else {
    console[level](`${ts} ${line}`);
  }
}

// ─── Classificador de erros Axios → EvolutionError ──────────────────────────

function classify(err: unknown, context: string): EvolutionError {
  if (err instanceof EvolutionError) return err;

  if (err instanceof AxiosError) {
    const status  = err.response?.status;
    const code    = err.code;
    const data    = err.response?.data;

    log('error', `${context} — Axios ${status ?? code}`, {
      status,
      axiosCode: code,
      url: err.config?.url,
      responseData: data,
    });

    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ECONNRESET') {
      return new EvolutionError('PROVIDER_OFFLINE',
        'Evolution API está offline ou inacessível (ECONNREFUSED/ENOTFOUND)', { code });
    }
    if (code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
      return new EvolutionError('PROVIDER_OFFLINE',
        'Evolution API não respondeu no tempo esperado (timeout 15s)', { code });
    }
    if (status === 401 || status === 403) {
      return new EvolutionError('AUTH_ERROR',
        `Autenticação rejeitada pela Evolution API (HTTP ${status}) — verifique EVOLUTION_API_KEY`, { status, data });
    }
    if (status === 404) {
      return new EvolutionError('INSTANCE_NOT_FOUND',
        `Instância não encontrada na Evolution API (HTTP 404) — verifique EVOLUTION_INSTANCE_NAME`, { status, data });
    }
    if (status === 400) {
      // Evolution retorna 400 quando a instância já está conectada e pedimos QR
      const msg = typeof data?.message === 'string' ? data.message.toLowerCase() : '';
      if (msg.includes('connect') || msg.includes('already')) {
        return new EvolutionError('ALREADY_CONNECTED',
          'Instância já está conectada — não é necessário gerar QR', { data });
      }
      return new EvolutionError('INVALID_RESPONSE',
        `Evolution retornou 400: ${data?.message ?? 'payload inválido'}`, { data });
    }
    return new EvolutionError('UNKNOWN',
      `Erro inesperado da Evolution API (HTTP ${status ?? 'N/A'})`, { status, data });
  }

  log('error', `${context} — erro não-Axios`, { err: String(err) });
  return new EvolutionError('UNKNOWN', String(err), err);
}

// ─── Factory do cliente Axios ────────────────────────────────────────────────

function createClient(): AxiosInstance {
  const base = process.env.EVOLUTION_BASE_URL;
  const key  = process.env.EVOLUTION_API_KEY;

  if (!base || !key) {
    log('warn', 'EVOLUTION_BASE_URL ou EVOLUTION_API_KEY não definidos — cliente dummy criado');
    return axios.create({ baseURL: 'http://localhost' });
  }

  log('info', `Cliente Evolution criado → ${base} (instância: ${process.env.EVOLUTION_INSTANCE_NAME ?? 'vilpack'})`);

  return axios.create({
    baseURL: base,
    headers: { apikey: key },
    timeout: 15_000,
  });
}

const client = createClient();
const INSTANCE = () => process.env.EVOLUTION_INSTANCE_NAME ?? 'vilpack';

// ─── Verificação de configuração ─────────────────────────────────────────────

function assertConfig() {
  if (!process.env.EVOLUTION_BASE_URL || !process.env.EVOLUTION_API_KEY) {
    throw new EvolutionError('CONFIG_MISSING',
      'EVOLUTION_BASE_URL e/ou EVOLUTION_API_KEY não configurados no ambiente');
  }
}

// ─── Serviço ─────────────────────────────────────────────────────────────────

export const evolutionService = {

  /** Estado da conexão da instância */
  async getInstanceStatus() {
    if (!featureFlags.ENABLE_WHATSAPP_PANEL) {
      log('info', 'getInstanceStatus ignorado — ENABLE_WHATSAPP_PANEL=false');
      return null;
    }
    assertConfig();
    const url = `/instance/connectionState/${INSTANCE()}`;
    log('info', `getInstanceStatus → GET ${url}`);
    try {
      const res = await client.get(url);
      log('info', 'getInstanceStatus OK', { state: res.data?.instance?.state ?? res.data?.state });
      return res.data;
    } catch (err) {
      throw classify(err, 'getInstanceStatus');
    }
  },

  /** Cria instância se não existir */
  async createInstance() {
    if (!featureFlags.ENABLE_WHATSAPP_PANEL) return null;
    assertConfig();
    log('info', `createInstance → POST /instance/create [${INSTANCE()}]`);
    try {
      const res = await client.post('/instance/create', {
        instanceName: INSTANCE(),
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      });
      log('info', 'createInstance OK', { hash: res.data?.hash });
      return res.data;
    } catch (err) {
      throw classify(err, 'createInstance');
    }
  },

  /**
   * Busca QR Code da instância.
   * Evolution /instance/connect/{name} retorna:
   *   { code: "QR_CODE_STRING", base64: "data:image/png;base64,..." }
   * ou, se já conectada:
   *   HTTP 400 com { message: "Instance already connected" }
   */
  async getQRCode() {
    if (!featureFlags.ENABLE_WHATSAPP_PANEL) return null;
    assertConfig();
    const url = `/instance/connect/${INSTANCE()}`;
    log('info', `getQRCode → GET ${url}`);
    try {
      const res = await client.get(url);
      const data = res.data;

      // Normaliza resposta — Evolution pode retornar diferentes formatos
      const base64 = data?.qrcode?.base64 ?? data?.base64 ?? data?.qr ?? null;
      const code   = data?.code ?? null;

      if (!base64 && !code) {
        log('warn', 'getQRCode — resposta sem QR Code', { data });
        throw new EvolutionError('QR_NOT_AVAILABLE',
          'Evolution respondeu mas não retornou QR Code — instância pode ainda estar inicializando', { data });
      }

      log('info', 'getQRCode OK', { hasBase64: !!base64, hasCode: !!code });
      return data;
    } catch (err) {
      // ALREADY_CONNECTED não é um erro real — re-throw com código específico
      const classified = classify(err, 'getQRCode');
      if (classified.code === 'ALREADY_CONNECTED') {
        log('info', 'getQRCode — instância já conectada, QR não necessário');
      }
      throw classified;
    }
  },

  /** Envia mensagem de texto */
  async sendText(to: string, text: string) {
    if (!featureFlags.ENABLE_WHATSAPP_PANEL) return null;
    assertConfig();
    log('info', `sendText → ${to} (${text.length} chars)`);
    try {
      const res = await client.post(`/message/sendText/${INSTANCE()}`, { number: to, text });
      log('info', 'sendText OK', { messageId: res.data?.key?.id });
      return res.data;
    } catch (err) {
      throw classify(err, `sendText[${to}]`);
    }
  },

  /** Envia mídia (imagem, doc, áudio) via URL ou base64 */
  async sendMedia(to: string, payload: {
    mediatype: 'image' | 'audio' | 'document' | 'video';
    media: string;
    caption?: string;
    fileName?: string;
  }) {
    if (!featureFlags.ENABLE_WHATSAPP_MEDIA) return null;
    assertConfig();
    log('info', `sendMedia → ${to} [${payload.mediatype}]`);
    try {
      const res = await client.post(`/message/sendMedia/${INSTANCE()}`, { number: to, ...payload });
      log('info', 'sendMedia OK', { messageId: res.data?.key?.id });
      return res.data;
    } catch (err) {
      throw classify(err, `sendMedia[${to}]`);
    }
  },

  /** Registra webhook na instância */
  async setWebhook(webhookUrl: string) {
    if (!featureFlags.ENABLE_EVOLUTION_WEBHOOKS) return null;
    assertConfig();
    log('info', `setWebhook → ${webhookUrl}`);
    try {
      const res = await client.post(`/webhook/set/${INSTANCE()}`, {
        url: webhookUrl,
        enabled: true,
        events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
      });
      log('info', 'setWebhook OK');
      return res.data;
    } catch (err) {
      throw classify(err, 'setWebhook');
    }
  },
};
