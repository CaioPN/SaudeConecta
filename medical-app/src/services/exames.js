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
