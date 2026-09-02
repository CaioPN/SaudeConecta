import api from './api';

/**
 * GET /api/avisos — avisos do Dashboard do paciente logado.
 *
 * O texto já vem pronto do backend (é lá que a regra sabe quantos dias
 * passaram desde o último exame ou quanto falta para o fim da campanha).
 *
 * Cada aviso pode vir com `pessoa`: o primeiro nome do dependente de quem ele
 * fala, ou null quando é do próprio titular.
 *
 * @returns {Promise<Array<{tipo: string, titulo: string, detalhe: string,
 *                          severidade: string, pessoa: ?string}>>}
 */
export async function buscarAvisos() {
  const { data } = await api.get('/avisos');
  return data.avisos || [];
}
