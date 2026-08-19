// Máscaras usadas quando o "olhinho" está fechado.
//
// A ideia é esconder o conteúdo mantendo a forma da linha: o paciente continua
// reconhecendo onde está cada informação, mas quem olha por cima do ombro não
// lê o dado. Nada aqui é reversível — o valor real segue no estado da tela e
// volta assim que o olhinho é aberto.

const PONTO = '•';

// Substitui letras e números por bolinhas, preservando pontuação e espaços —
// bom para dados com formato conhecido (CPF, telefone, data, CEP).
export function mascarar(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  return String(valor).replace(/[\p{L}\p{N}]/gu, PONTO);
}

// Texto livre (laudo, diagnóstico, aviso): vira um bloco curto de bolinhas.
// Não acompanha o tamanho real do texto de propósito — o comprimento sozinho
// já entrega qual é o registro em uma lista.
export function mascararTexto(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  return PONTO.repeat(10);
}

// Número de resultado de exame, sempre com a mesma largura.
export function mascararValor() {
  return PONTO.repeat(3);
}
