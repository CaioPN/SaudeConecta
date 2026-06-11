import axios from 'axios';

// Instância do axios apontando para a API do backend (SaúdeConecta).
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

// Antes de cada requisição, injeta o token JWT (se houver) no header.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
