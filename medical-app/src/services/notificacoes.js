import api from './api';

/**
 * Notificações do paciente — o que aconteceu na conta enquanto ele não estava
 * olhando (um médico registrou uma consulta, um exame ou mexeu no prontuário).
 *
 * Não confundir com os avisos do Dashboard (`services/avisos.js`): aviso é
 * calculado na hora a partir dos exames e das consultas e não é gravado;
 * notificação é um fato que aconteceu uma vez e tem linha no banco.
 */

/** GET /api/notificacoes — lista e contagem de não lidas. */
export async function listarNotificacoes() {
  const { data } = await api.get('/notificacoes');
  return {
    notificacoes: (data.notificacoes || []).map((n) => ({
      id: n.id,
      tipo: n.tipo,
      mensagem: n.mensagem,
      criadoEm: n.criado_em,
      lida: n.lida_em !== null && n.lida_em !== undefined,
    })),
    naoLidas: data.nao_lidas || 0,
  };
}

/** POST /api/notificacoes/{id}/lida — marca uma como lida. */
export async function marcarLida(id) {
  const { data } = await api.post(`/notificacoes/${id}/lida`);
  return data.nao_lidas || 0;
}

/** POST /api/notificacoes/lidas — marca todas como lidas. */
export async function marcarTodasLidas() {
  const { data } = await api.post('/notificacoes/lidas');
  return data.marcadas || 0;
}
