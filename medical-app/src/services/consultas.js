import api from './api';

// Achata o médico (que vem aninhado no JSON) nos campos usados pelas telas.
function normalizarConsulta(c) {
  return {
    id: c.id,
    // De quem é a consulta: null no titular. O "anotar retorno" precisa
    // disso para a consulta nova nascer da mesma pessoa.
    dependenteId: c.dependente_id ?? null,
    data: c.data,
    hora: c.hora,
    local: c.local,
    // Unidade da Rede de Saúde onde a consulta acontece, quando ela foi
    // marcada em uma. É o que permite oferecer "Como chegar" com a coordenada
    // oficial do CNES em vez do texto livre do campo local.
    unidadeCnes: c.unidade_cnes ?? null,
    motivo: c.motivo,
    status: c.status,
    // 'medico' (registrada pelo profissional com o código de acesso) ou
    // 'paciente' (anotada pelo titular). Só a segunda pode ser editada e
    // apagada aqui — a primeira é prontuário.
    origem: c.origem || 'medico',
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

/**
 * POST /api/consultas — o paciente anota uma consulta que ele marcou.
 *
 * O app não agenda: quem marca é a unidade, por telefone ou no balcão. Isto
 * aqui é o lembrete disso, e por isso o backend fixa o status como "agendada" e
 * a origem como "paciente" — resumo e conduta continuam sendo do profissional.
 */
export async function criarConsulta(consulta) {
  const { data } = await api.post('/consultas', consulta);
  return data.id;
}

/** PUT /api/consultas/{id} — corrige uma consulta anotada pelo paciente. */
export async function atualizarConsulta(id, consulta) {
  await api.put(`/consultas/${id}`, consulta);
}

/** DELETE /api/consultas/{id} — apaga uma consulta anotada pelo paciente. */
export async function excluirConsulta(id) {
  await api.delete(`/consultas/${id}`);
}

/**
 * GET /api/consultas/sugestoes — profissionais e locais que já apareceram na
 * conta, para o formulário preencher sozinho em vez de fazer o paciente
 * digitar tudo de novo a cada retorno.
 */
export async function buscarSugestoes() {
  const { data } = await api.get('/consultas/sugestoes');
  return (data.sugestoes || []).map((s) => ({
    profissional: s.profissional,
    especialidade: s.especialidade || '',
    local: s.local || '',
    unidadeCnes: s.unidade_cnes ?? null,
  }));
}

/**
 * PUT /api/consultas/{id}/situacao — o paciente diz se foi à consulta.
 *
 * Só a situação muda: resumo e conduta continuam sendo do profissional. O
 * backend aceita apenas "realizada" e "cancelada", e só sai de "agendada".
 */
export async function definirSituacao(id, status) {
  await api.put(`/consultas/${id}/situacao`, { status });
}
