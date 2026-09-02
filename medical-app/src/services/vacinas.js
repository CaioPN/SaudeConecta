import api from './api';

/**
 * Carteira de vacinação — o calendário do PNI cruzado com o que a pessoa tomou.
 *
 * O calendário mora no banco (tabela `calendario_vacinal`) e não mais só aqui
 * no front. O motivo é que agora ele tem dois leitores: esta tela, que monta a
 * carteira, e o AvisoDAO, que conta as doses atrasadas para o Dashboard. Duas
 * cópias — uma em JS, outra em Java — sairiam do ar uma da outra no primeiro
 * ajuste do Ministério da Saúde.
 *
 * (`data/vacinas.js` continua existindo para a versão de demonstração em
 * `demo/`, que não tem backend nenhum para consultar.)
 */

function normalizarDose(d) {
  return {
    id: d.id,
    vacina: d.vacina,
    dose: d.dose,
    periodo: d.periodo,
    protege: d.protege,
    prevista: d.prevista,
    aplicadaEm: d.aplicada_em,
    origem: d.origem,
    // 'aplicada' | 'atrasada' | 'prevista' — calculado no backend, porque
    // depende da data de hoje e da data de nascimento que está no banco.
    status: d.status,
  };
}

/**
 * GET /api/vacinas — carteira da pessoa escolhida.
 *
 * @param {number} [dependenteId] Traz a carteira de um dependente.
 * @returns {Promise<{publico: string, doses: Array, resumo: object}>}
 */
export async function buscarCarteira(dependenteId) {
  const { data } = await api.get('/vacinas', {
    params: dependenteId ? { dependenteId } : undefined,
  });
  return {
    publico: data.publico,
    doses: (data.doses || []).map(normalizarDose),
    resumo: data.resumo || { total: 0, aplicadas: 0, atrasadas: 0 },
  };
}

/**
 * POST /api/vacinas — marca uma dose como aplicada.
 *
 * Sem `data`, o backend usa hoje: o caso comum é marcar ao voltar do posto.
 */
export async function registrarDose(doseId, { dependenteId, data } = {}) {
  await api.post('/vacinas', { doseId, dependenteId, data });
}

/** DELETE /api/vacinas/{doseId} — desmarca uma dose registrada por engano. */
export async function removerDose(doseId, dependenteId) {
  await api.delete(`/vacinas/${doseId}`, {
    params: dependenteId ? { dependenteId } : undefined,
  });
}
