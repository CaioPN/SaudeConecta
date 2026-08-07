import api from './api';

/**
 * POST /api/chat — manda a pergunta livre para o assistente com IA.
 *
 * A chave da API fica só no backend Java; o front nunca a vê. Só o texto
 * digitado é enviado — nenhum dado do paciente sai daqui (ver ChatIA.java).
 *
 * @param {string} pergunta Texto digitado pelo usuário.
 * @returns {Promise<string|null>} A resposta, ou null se a IA não respondeu
 *          (sem chave configurada, cota estourada ou falha de rede). O
 *          componente trata o null exibindo a mensagem de fallback.
 */
export async function perguntarIA(pergunta) {
  try {
    const { data } = await api.post('/chat', { pergunta });
    return data.resposta || null;
  } catch {
    return null;
  }
}
