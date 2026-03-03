export const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Em produção, se a variável não estiver definida, assume rota relativa (proxy)
  // para evitar mixed content ou acesso a localhost
  if (import.meta.env.PROD) {
    return '/api';
  }
  // Em desenvolvimento, fallback para localhost
  return 'http://localhost:3001/api';
};

export const API_URL = getApiUrl();
