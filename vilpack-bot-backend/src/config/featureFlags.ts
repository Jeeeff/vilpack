/**
 * Feature Flags — WhatsApp Module
 * Todas as flags começam false. Ative via variáveis de ambiente.
 * Isso garante que o módulo seja invisível até estar pronto.
 */
export const featureFlags = {
  ENABLE_WHATSAPP_PANEL:            process.env.ENABLE_WHATSAPP_PANEL            === 'true',
  ENABLE_EVOLUTION_WEBHOOKS:        process.env.ENABLE_EVOLUTION_WEBHOOKS        === 'true',
  ENABLE_WHATSAPP_BOT:              process.env.ENABLE_WHATSAPP_BOT              === 'true',
  ENABLE_WHATSAPP_MEDIA:            process.env.ENABLE_WHATSAPP_MEDIA            === 'true',
  ENABLE_WHATSAPP_AUDIO_TRANSCRIPTION: process.env.ENABLE_WHATSAPP_AUDIO_TRANSCRIPTION === 'true',
  ADMIN_REALTIME_ENABLED:           process.env.ADMIN_REALTIME_ENABLED           === 'true',
} as const;

export type FeatureFlag = keyof typeof featureFlags;
