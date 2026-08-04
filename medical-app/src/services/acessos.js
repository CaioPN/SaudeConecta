import api from './api';

/**
 * POST /api/acessos — gera um código temporário para o paciente mostrar ao médico.
 *
 * O código só volta nesta resposta: o banco guarda apenas o hash, então ele não
 * pode ser recuperado depois. Se o paciente perder, gera outro.
 *
 * @param {'leitura'|'escrita'} escopo
 */
export async function gerarAcesso(escopo = 'leitura') {
  const { data } = await api.post('/acessos', { escopo });
  return data;
}

/** GET /api/acessos — acessos do paciente, do mais recente para o mais antigo. */
export async function listarAcessos() {
  const { data } = await api.get('/acessos');
  return (data.acessos || []).map((a) => ({
    id: a.id,
    escopo: a.escopo,
    criadoEm: a.criado_em,
    expiraEm: a.expira_em,
    usadoEm: a.usado_em,
    revogadoEm: a.revogado_em,
    medico: a.medico?.nome || null,
    crm: a.medico?.crm || null,
  }));
}

/** DELETE /api/acessos/{id} — revoga o acesso; vale imediatamente. */
export async function revogarAcesso(id) {
  const { data } = await api.delete(`/acessos/${id}`);
  return data;
}

/**
 * Situação de um acesso para exibição.
 * @returns {'revogado'|'expirado'|'em-uso'|'aguardando'}
 */
export function situacaoAcesso(acesso, agora = new Date()) {
  if (acesso.revogadoEm) return 'revogado';
  if (new Date(acesso.expiraEm) <= agora) return 'expirado';
  return acesso.usadoEm ? 'em-uso' : 'aguardando';
}
