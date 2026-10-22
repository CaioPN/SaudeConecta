// O que deu errado numa chamada à API, dito de um jeito só em todas as telas
// (critério INT03 do backlog).
//
// A regra que este arquivo existe para garantir: quando a busca falha, a tela
// NÃO diz nada sobre os dados. Antes, várias telas trocavam a falha por uma
// lista vazia — o Início dizia "Não há avisos no momento", o detalhe da
// consulta dizia "Consulta não encontrada" — e o paciente sem internet lia
// que estava tudo em dia. Sem resposta do servidor, o app não sabe se há
// avisos; dizer que não há é afirmar um sucesso que não aconteceu.

/**
 * Classifica a falha:
 * - 'sem_conexao': a requisição nem chegou ao servidor (sem internet, API
 *   fora do ar, tempo esgotado) — o axios não traz `response`;
 * - 'sessao': 401, o login venceu;
 * - 'nao_encontrado': 404, o servidor respondeu que o item não existe — é o
 *   único caso em que dá para afirmar alguma coisa sobre o dado;
 * - 'servidor': qualquer outro erro com resposta.
 */
export function tipoDaFalha(erro) {
  if (!erro) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'sem_conexao';
  const status = erro.response?.status;
  if (!status) return 'sem_conexao';
  if (status === 401) return 'sessao';
  if (status === 404) return 'nao_encontrado';
  return 'servidor';
}

/**
 * Mensagem de uma AÇÃO que falhou (salvar, apagar, gerar código). Prefere o
 * texto que a API mandou — ele diz o motivo ("A data de nascimento não pode
 * estar no futuro") —, mas sem conexão não há texto da API, e o paciente
 * precisa saber que nada foi gravado.
 */
export function mensagemDaAcao(erro, padrao) {
  if (tipoDaFalha(erro) === 'sem_conexao') {
    return 'Sem conexão: nada foi salvo. Confira a internet e tente de novo.';
  }
  return erro?.response?.data?.erro || padrao;
}
