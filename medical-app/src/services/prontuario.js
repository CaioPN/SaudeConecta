import api from './api';

/**
 * GET /api/prontuario — alergias, condições e medicações do paciente logado.
 *
 * @param {number} [dependenteId] Traz o prontuário de um dependente.
 * @returns {Promise<{alergias: Array, condicoes: Array, medicacoes: Array}>}
 */
export async function buscarProntuario(dependenteId) {
  const { data } = await api.get('/prontuario', {
    params: dependenteId ? { dependenteId } : undefined,
  });
  return {
    alergias: data.alergias || [],
    condicoes: data.condicoes || [],
    // "50mg · 1 comprimido pela manhã" é o texto que a tela mostra.
    medicacoes: (data.medicacoes || []).map((m) => ({
      id: m.id,
      nome: m.nome,
      dosagem: m.dosagem,
      posologia: [m.dosagem, m.frequencia].filter(Boolean).join(' · '),
      desde: m.desde,
    })),
  };
}

/**
 * POST /api/prontuario — o paciente informa uma alergia ou uma condição dele
 * ou de um dependente. Fica gravada como "informada pelo paciente".
 *
 * @param {{tipo: 'alergia'|'condicao', descricao: string, desde?: string, dependenteId?: number}} item
 */
export async function informarItem({ tipo, descricao, desde, dependenteId }) {
  const { data } = await api.post('/prontuario', {
    tipo,
    descricao,
    desde: desde || undefined,
    dependenteId: dependenteId || undefined,
  });
  return data;
}

/**
 * DELETE /api/prontuario/{tipo}/{id} — apaga uma alergia ou condição que o
 * próprio paciente informou. O que o profissional registrou devolve 404.
 */
export async function apagarItemInformado(tipo, id) {
  await api.delete(`/prontuario/${tipo}/${id}`);
}
