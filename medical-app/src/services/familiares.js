import api from './api';

/**
 * Contatos de emergência do paciente: quem avisar se algo acontecer.
 *
 * São dados de OUTRA pessoa (nome e telefone de um familiar), por isso não
 * entram no resumo enviado ao médico pelo acesso temporário — quem consentiu
 * com o cadastro foi o paciente, não o familiar.
 */

/** GET /api/familiares — contatos do paciente logado. */
export async function listarFamiliares() {
  const { data } = await api.get('/familiares');
  return data.familiares || [];
}

/** POST /api/familiares — cadastra um contato e devolve o que foi salvo. */
export async function cadastrarFamiliar({ nome, parentesco, telefone }) {
  const { data } = await api.post('/familiares', { nome, parentesco, telefone });
  return data.familiar;
}

/** DELETE /api/familiares/{id} — remove um contato. */
export async function removerFamiliar(id) {
  await api.delete(`/familiares/${id}`);
}
