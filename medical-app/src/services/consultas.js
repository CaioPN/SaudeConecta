import api from './api';

// Achata o médico (que vem aninhado no JSON) nos campos usados pelas telas.
function normalizarConsulta(c) {
  return {
    id: c.id,
    data: c.data,
    hora: c.hora,
    local: c.local,
    // Unidade da Rede de Saúde onde a consulta acontece, quando ela foi
    // marcada em uma. É o que permite oferecer "Como chegar" com a coordenada
    // oficial do CNES em vez do texto livre do campo local.
    unidadeCnes: c.unidade_cnes ?? null,
    motivo: c.motivo,
    status: c.status,
    resumo: c.resumo,
    conduta: c.conduta,
    medico: c.medico?.nome || 'Profissional não informado',
    especialidade: c.medico?.especialidade || '',
  };
}

/**
 * GET /api/consultas — consultas do paciente logado, já ordenadas da mais
 * recente para a mais antiga pelo backend.
 *
 * @param {number} [dependenteId] Traz as consultas de um dependente.
 */
export async function listarConsultas(dependenteId) {
  const { data } = await api.get('/consultas', {
    params: dependenteId ? { dependenteId } : undefined,
  });
  return (data.consultas || []).map(normalizarConsulta);
}

/** GET /api/consultas/{id} — detalhe de uma consulta. */
export async function buscarConsulta(id) {
  const { data } = await api.get(`/consultas/${id}`);
  return data.consulta ? normalizarConsulta(data.consulta) : null;
}
