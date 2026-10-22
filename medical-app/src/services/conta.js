import api from './api';

/**
 * Direitos do titular (LGPD, art. 18) sobre a conta inteira.
 */

/**
 * GET /api/conta/exportacao — todos os dados da conta, e baixa como arquivo
 * .json. O arquivo é montado pelo servidor (que audita a entrega); aqui ele
 * só vira um download.
 */
export async function baixarMeusDados() {
  const { data } = await api.get('/conta/exportacao');
  const texto = JSON.stringify(data, null, 2);
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `saudeconecta-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return data;
}

/** GET /api/conta/resumo — quanto a conta tem, para dizer o que vai junto na exclusão. */
export async function resumoDaConta() {
  const { data } = await api.get('/conta/resumo');
  return data.totais || {};
}

/**
 * DELETE /api/conta — exclui a conta. A senha vai no corpo, e não na URL: a
 * URL fica no log do servidor e no histórico do navegador.
 */
export async function excluirConta(senha) {
  await api.delete('/conta', { data: { senha } });
}
