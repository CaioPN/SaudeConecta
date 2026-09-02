import api from './api';

/**
 * PUT /api/auth/me — o paciente corrige o próprio contato e endereço.
 *
 * Só telefone e endereço são editáveis. Nome, CPF, data de nascimento, gênero,
 * tipo sanguíneo e e-mail ficam de fora no backend também (ver
 * PacienteDAO.atualizarContato): são dados de identificação e de saúde que o
 * atendimento usa para reconhecer a pessoa, e o e-mail ainda é a chave do
 * login e da recuperação de senha.
 *
 * @returns {Promise<object>} o paciente já atualizado, como vem da API
 */
export async function atualizarPerfil({ telefone, cep, rua, numero, bairro, cidade, estado }) {
  const { data } = await api.put('/auth/me', {
    telefone, cep, rua, numero, bairro, cidade, estado,
  });
  return data.paciente;
}
