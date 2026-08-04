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
