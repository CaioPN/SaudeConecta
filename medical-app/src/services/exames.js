import api from './api';

// Converte o item vindo da API (ref_min/ref_max, valores como string decimal)
// para o formato usado pelos componentes de exibição (min/max numéricos).
function normalizarItem(item) {
  return {
    id: item.id,
    nome: item.nome,
    valor: Number(item.valor),
    unidade: item.unidade,
    min: Number(item.ref_min),
    max: Number(item.ref_max),
  };
}

function normalizarExame(exame) {
  return {
    id: exame.id,
    data: exame.data,
    local: exame.local,
    nome: exame.nome,
    laudo: exame.laudo,
    consultaId: exame.consulta_id,
    solicitante: exame.solicitante?.nome || null,
    crm: exame.solicitante?.crm ? `CRM ${exame.solicitante.crm}` : null,
    // 'paciente' = importado pelo próprio paciente de um PDF de outro lugar.
    origem: exame.origem || 'medico',
    temDocumento: Boolean(exame.tem_documento),
    itens: (exame.itens || []).map(normalizarItem),
  };
}

/**
 * GET /api/exames — exames do paciente logado.
 *
 * @param {number} [dependenteId] Traz os exames de um dependente em vez dos do titular.
 * @returns {Promise<{coletas: Array, imagem: Array}>}
 */
export async function buscarExames(dependenteId) {
  const { data } = await api.get('/exames', {
    params: dependenteId ? { dependenteId } : undefined,
  });
  return {
    coletas: (data.coletas || []).map(normalizarExame),
    imagem: (data.imagem || []).map(normalizarExame),
  };
}

/**
 * POST /api/exames — o paciente importa um exame feito em outro lugar.
 *
 * @param {object} exame  `{ tipo, data, local, itens | nome+laudo, dependenteId }`
 * @param {{ nome: string, conteudo: string }} [documento]  O PDF original em base64.
 */
export async function importarExame(exame, documento) {
  const { data } = await api.post('/exames', { ...exame, documento });
  return data;
}

/**
 * GET /api/exames/{id}/documento — o PDF original, como Blob. Vem pelo axios
 * (e não por um link direto) porque a rota exige o token no cabeçalho.
 */
export async function buscarDocumento(id) {
  const { data } = await api.get(`/exames/${id}/documento`, { responseType: 'blob' });
  return data;
}

/** DELETE /api/exames/{id} — apaga um exame que o próprio paciente importou. */
export async function excluirExameImportado(id) {
  const { data } = await api.delete(`/exames/${id}`);
  return data;
}
