import axios from 'axios';
import { usarServidorDemo } from '../demo/modo';

// Instância do axios apontando para a API do backend (SaúdeConecta).
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

// No build de demonstração as chamadas são respondidas no próprio navegador,
// com dados fictícios (ver demo/servidor.js). No build normal não faz nada.
usarServidorDemo(api);

// Antes de cada requisição, injeta o token JWT (se houver) no header.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
