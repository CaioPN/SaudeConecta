import api from './api';

/**
 * POST /api/auth/recuperar — primeiro passo do "esqueci minha senha".
 *
 * Não existe serviço de e-mail no projeto, então o que prova a identidade é a
 * conferência de três dados do cadastro. Em troca vem um token de poucos
 * minutos, que só serve para a chamada seguinte.
 *
 * O token fica no estado da tela e nunca no localStorage: ele autoriza trocar
 * a senha da conta, e deixá-lo gravado seria pior do que a senha esquecida.
 *
 * @returns {Promise<{token: string, nome: string, validade_minutos: number}>}
 */
export async function conferirIdentidade({ email, cpf, dataNascimento }) {
  const { data } = await api.post('/auth/recuperar', { email, cpf, dataNascimento });
  return data;
}

/** POST /api/auth/redefinir — grava a senha nova usando o token da conferência. */
export async function redefinirSenha({ token, senha }) {
  const { data } = await api.post('/auth/redefinir', { token, senha });
  return data;
}
