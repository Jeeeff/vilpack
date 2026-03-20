/**
 * Feature Flags — Frontend
 * Lê as variáveis VITE_* do .env do frontend.
 * Se não definidas, tudo começa false (módulo invisível).
 */
export const featureFlags = {
  ENABLE_WHATSAPP_PANEL: import.meta.env.VITE_ENABLE_WHATSAPP_PANEL === 'true',
  ADMIN_REALTIME_ENABLED: import.meta.env.VITE_ADMIN_REALTIME_ENABLED === 'true',
} as const;
