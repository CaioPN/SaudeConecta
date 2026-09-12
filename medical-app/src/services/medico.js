import axios from 'axios';

// Instância própria, SEM o interceptor que injeta o token do paciente: o portal
// do médico usa o token temporário do acesso, que é passado a cada chamada.
const apiMedico = axios.create({
  baseURL: 'http://localhost:3001/api',
});

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

/**
 * POST /api/medico/entrar — troca o código do paciente por um token temporário.
 *
 * @returns {Promise<{token, escopo, expira_em, paciente}>}
 */
export async function entrarComCodigo({ codigo, nome, crm, especialidade }) {
  const { data } = await apiMedico.post('/medico/entrar', { codigo, nome, crm, especialidade });
  return data;
}

/** GET /api/medico/paciente — resumo clínico liberado pelo acesso. */
export async function buscarPacienteDoAcesso(token) {
  const { data } = await apiMedico.get('/medico/paciente', auth(token));
  return data;
}

/** POST /api/medico/consultas — registra o atendimento no prontuário do paciente. */
export async function registrarConsulta(token, consulta) {
  const { data } = await apiMedico.post('/medico/consultas', consulta, auth(token));
  return data;
}

/** POST /api/medico/exames — registra uma coleta de sangue com seus resultados. */
export async function registrarExame(token, exame) {
  const { data } = await apiMedico.post('/medico/exames', exame, auth(token));
  return data;
}

/**
 * POST /api/medico/prontuario — lança uma alergia, uma condição acompanhada ou
 * uma medicação em uso.
 *
 * @param {object} item `{ tipo: 'alergia' | 'condicao' | 'medicacao', ... }`
 */
export async function registrarItemProntuario(token, item) {
  const { data } = await apiMedico.post('/medico/prontuario', item, auth(token));
  return data;
}

/**
 * DELETE /api/medico/prontuario/{tipo}/{id} — remove um item lançado errado.
 *
 * Corrigir prontuário é remover e lançar de novo: as duas operações aparecem
 * separadas no histórico de acessos que o paciente vê.
 */
export async function removerItemProntuario(token, tipo, id) {
  const { data } = await apiMedico.delete(`/medico/prontuario/${tipo}/${id}`, auth(token));
  return data;
}

/**
 * GET /api/medico/vacinas — a carteira de quem o código abriu.
 *
 * Escrever na carteira é do profissional: o paciente vê as doses no app dele,
 * mas não marca nada. Por isso o registro e o desfazer moram aqui, e não em
 * services/vacinas.js.
 */
export async function buscarCarteira(token) {
  const { data } = await apiMedico.get('/medico/vacinas', auth(token));
  return data;
}

/** POST /api/medico/vacinas — marca uma dose como aplicada (hoje, sem `data`). */
export async function registrarDose(token, doseId, dataAplicacao) {
  const { data } = await apiMedico.post(
    '/medico/vacinas', { doseId, data: dataAplicacao }, auth(token),
  );
  return data;
}

/** DELETE /api/medico/vacinas/{doseId} — desfaz uma dose marcada por engano. */
export async function removerDose(token, doseId) {
  const { data } = await apiMedico.delete(`/medico/vacinas/${doseId}`, auth(token));
  return data;
}
