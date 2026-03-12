export const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();

  // Variável definida explicitamente (ex: dev com localhost)
  if (envUrl && envUrl !== 'undefined') {
    return envUrl;
  }

  // Produção (build Docker): usa rota relativa — o nginx faz o proxy /api/ → backend:3001
  // Desenvolvimento sem .env: fallback para localhost
  return import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
};

export const API_URL = getApiUrl();

// Só loga em dev para não poluir console de produção
if (import.meta.env.DEV) {
  console.log(`[API_CONFIG] Base URL set to: ${API_URL}`);
}
