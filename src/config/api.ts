export const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  
  if (envUrl && envUrl !== 'undefined') {
    return envUrl;
  }

  // Log de erro para ajudar no diagnóstico de produção
  console.error('[API_CONFIG] VITE_API_URL is missing or undefined. Check your .env file and build process.');

  // Em produção, se a variável não estiver definida, assume rota relativa (proxy)
  // para evitar mixed content ou acesso a localhost
  if (import.meta.env.PROD) {
    return '/api';
  }
  // Em desenvolvimento, fallback para localhost
  return 'http://localhost:3001/api';
};

export const API_URL = getApiUrl();
console.log(`[API_CONFIG] Base URL set to: ${API_URL}`);
