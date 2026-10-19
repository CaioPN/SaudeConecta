// Avaliação do projeto pelos visitantes da feira — só existe na demonstração.
//
// A demo é estática (GitHub Pages), sem servidor para guardar nada, então as
// respostas vão para um Google Forms: cada envio vira uma linha na planilha
// ligada ao formulário. A tela tem o visual do app; o Forms é só o depósito.
//
// COMO LIGAR AO FORMULÁRIO
// 1. Crie o Forms com as perguntas na MESMA ordem dos CRITERIOS abaixo
//    (escala linear de 0 a 5), mais "Quem é você?", "Recurso de que mais
//    gostou" (múltipla escolha, com as opções EXATAS de PERFIS e RECURSOS) e
//    "Feedback" (parágrafo).
//    O que é obrigatório no Forms tem de ser obrigatório na tela: se faltar um
//    campo obrigatório, o Google recusa a resposta inteira, e como o envio é
//    no-cors a tela não fica sabendo. Hoje só o feedback é opcional.
// 2. No Forms: ⋮ → "Gerar link pré-preenchido", responda qualquer coisa e
//    copie o link. Cada campo aparece nele como `entry.123456789=...`.
// 3. Cole aqui o ID do formulário (o trecho entre /d/e/ e /viewform) e o
//    número de cada `entry.` no campo correspondente.
// Enquanto FORM_ID estiver vazio, a tela funciona mas avisa que não envia.

export const FORM_ID = '1FAIpQLSeuh6SO94TxzkdXqvBsQRZejMkA5JvvjvpNk-Uha2KIkc9QIw';

export const CRITERIOS = [
  { id: 'layout', titulo: 'Layout e visual', pergunta: 'O app é bonito e organizado?', entry: '1679277917' },
  { id: 'facilidade', titulo: 'Facilidade de uso', pergunta: 'Você encontrou o que procurava sem ajuda?', entry: '128914992' },
  { id: 'funcionalidades', titulo: 'Funcionalidades', pergunta: 'O que o app oferece é suficiente para cuidar da saúde?', entry: '487352898' },
  { id: 'utilidade', titulo: 'Utilidade no dia a dia', pergunta: 'Você usaria o app junto com o SUS?', entry: '552833647' },
  { id: 'acessibilidade', titulo: 'Acessibilidade', pergunta: 'Texto maior, contraste e Libras atendem quem precisa?', entry: '849105218' },
  { id: 'privacidade', titulo: 'Privacidade e confiança', pergunta: 'Você se sentiria seguro de guardar seus dados aqui?', entry: '1750893227' },
  { id: 'geral', titulo: 'Nota geral', pergunta: 'Que nota você dá ao projeto como um todo?', entry: '120378545' },
];

export const PERFIS = ['Professor', 'Aluno', 'Visitante'];

export const RECURSOS = [
  'Ficha de emergência',
  'Carteira de vacinação',
  'Rede de Saúde',
  'Acesso do Médico',
  'Exames com Gráficos',
  'Chatbot',
  'Acessibilidade',
];

export const ENTRY_PERFIL = '2094236019';
export const ENTRY_RECURSO = '869405656';
export const ENTRY_FEEDBACK = '919021468';

export const FORMULARIO_CONFIGURADO =
  FORM_ID !== '' && CRITERIOS.every((c) => c.entry !== '');

/**
 * Envia uma avaliação ao Google Forms.
 *
 * O Forms não libera CORS, então o envio é `no-cors`: a resposta volta opaca e
 * não dá para ler se gravou. O que dá para saber é falha de rede (sem
 * internet), que rejeita a promessa — e é isso que a tela trata como erro.
 */
export async function enviarAvaliacao({ notas, perfil, recurso, feedback }) {
  if (!FORMULARIO_CONFIGURADO) {
    throw new Error('formulario_nao_configurado');
  }

  const corpo = new URLSearchParams();
  CRITERIOS.forEach((c) => corpo.append(`entry.${c.entry}`, String(notas[c.id])));
  if (perfil && ENTRY_PERFIL) corpo.append(`entry.${ENTRY_PERFIL}`, perfil);
  if (recurso && ENTRY_RECURSO) corpo.append(`entry.${ENTRY_RECURSO}`, recurso);
  if (feedback.trim() && ENTRY_FEEDBACK) corpo.append(`entry.${ENTRY_FEEDBACK}`, feedback.trim());

  await fetch(`https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`, {
    method: 'POST',
    mode: 'no-cors',
    body: corpo,
  });
}
