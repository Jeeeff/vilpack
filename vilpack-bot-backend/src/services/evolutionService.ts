/**
 * evolutionService — camada de integração com a Evolution API.
 * Centraliza TODAS as chamadas HTTP para a Evolution.
 * O frontend nunca fala diretamente com a Evolution.
 */
import axios, { AxiosInstance } from 'axios';
import { featureFlags } from '../config/featureFlags.js';

function createClient(): AxiosInstance {
  const base = process.env.EVOLUTION_BASE_URL;
  const key  = process.env.EVOLUTION_API_KEY;

  if (!base || !key) {
    // Retorna cliente dummy — falhas serão tratadas nas chamadas individuais
    return axios.create({ baseURL: 'http://localhost' });
  }

  return axios.create({
    baseURL: base,
    headers: { apikey: key },
    timeout: 15_000,
  });
}

const client = createClient();
const INSTANCE = () => process.env.EVOLUTION_INSTANCE_NAME ?? 'vilpack';

export const evolutionService = {
  /** Retorna o QR Code ou status atual da instância */
  async getInstanceStatus() {
    if (!featureFlags.ENABLE_WHATSAPP_PANEL) return null;
    const res = await client.get(`/instance/connectionState/${INSTANCE()}`);
    return res.data;
  },

  /** Cria instância se não existir */
  async createInstance() {
    if (!featureFlags.ENABLE_WHATSAPP_PANEL) return null;
    const res = await client.post('/instance/create', {
      instanceName: INSTANCE(),
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    });
    return res.data;
  },

  /** Busca QR Code */
  async getQRCode() {
    if (!featureFlags.ENABLE_WHATSAPP_PANEL) return null;
    const res = await client.get(`/instance/connect/${INSTANCE()}`);
    return res.data;
  },

  /** Envia mensagem de texto */
  async sendText(to: string, text: string) {
    if (!featureFlags.ENABLE_WHATSAPP_PANEL) return null;
    const res = await client.post(`/message/sendText/${INSTANCE()}`, {
      number: to,
      text,
    });
    return res.data;
  },

  /** Envia mídia (imagem, doc, áudio) via URL ou base64 */
  async sendMedia(to: string, payload: {
    mediatype: 'image' | 'audio' | 'document' | 'video';
    media: string;      // URL ou base64
    caption?: string;
    fileName?: string;
  }) {
    if (!featureFlags.ENABLE_WHATSAPP_MEDIA) return null;
    const res = await client.post(`/message/sendMedia/${INSTANCE()}`, {
      number: to,
      ...payload,
    });
    return res.data;
  },

  /** Registra webhook na instância */
  async setWebhook(webhookUrl: string) {
    if (!featureFlags.ENABLE_EVOLUTION_WEBHOOKS) return null;
    const res = await client.post(`/webhook/set/${INSTANCE()}`, {
      url: webhookUrl,
      enabled: true,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CONNECTION_UPDATE',
        'QRCODE_UPDATED',
      ],
    });
    return res.data;
  },
};
