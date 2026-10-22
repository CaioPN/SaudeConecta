import { novoRelatorio, fecharRelatorio, nomeDeArquivo } from './pdf';

// O PDF da carteira de vacinação e o texto de data de cada dose — o mesmo na
// tela (screens/Vacinas.jsx) e no arquivo. Fica fora da tela para ser
// JavaScript puro, como o utils/pdf.js.

// "2026-04-12" -> "12/04/2026". Sem new Date() de propósito: a data vem do
// banco sem fuso, e o construtor a interpretaria como UTC, o que muda o dia.
export function formatarDataIso(iso) {
  if (!iso || iso.length < 10) return iso || '';
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** Texto da data de uma dose — o mesmo na tela e no PDF. */
export function textoDaData(v) {
  if (v.status === 'aplicada') return v.aplicadaEm ? `Aplicada em ${formatarDataIso(v.aplicadaEm)}` : 'Aplicada';
  if (v.status === 'atrasada') return v.prevista ? `Era para ter sido tomada em ${formatarDataIso(v.prevista)}` : 'Em atraso';
  return v.prevista ? `Prevista para ${formatarDataIso(v.prevista)}` : v.periodo;
}

/**
 * Gera o PDF da carteira, nas mesmas três seções da tela. A senha, o
 * cabeçalho e o rodapé vêm de utils/pdf.js — os mesmos do PDF de exames.
 */
export function gerarPdfCarteira({ senha, nome, rotuloIdade, atrasadas, previstas, aplicadas }) {
  const { doc, pagina, espaco } = novoRelatorio({ senha, titulo: 'Carteira de Vacinação', nome });

  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  pagina.y += 7;
  doc.text(`${rotuloIdade} · Calendário Nacional de Vacinação (PNI/SUS)`, 14, pagina.y);

  const secao = (titulo, cor, doses) => {
    if (doses.length === 0) return;
    espaco(30);
    pagina.y += 12;
    doc.setFontSize(12);
    doc.setTextColor(...cor);
    doc.text(`${titulo} (${doses.length})`, 14, pagina.y);

    pagina.y += 7;
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text('Vacina', 14, pagina.y);
    doc.text('Dose', 82, pagina.y);
    doc.text('Período', 120, pagina.y);
    doc.text('Data', 158, pagina.y);

    doc.setFontSize(10);
    doses.forEach((v) => {
      // Nome longo ("Tríplice viral (sarampo, caxumba e rubéola)") quebra em
      // linhas, e a linha da tabela cresce junto.
      const linhasNome = doc.splitTextToSize(String(v.vacina), 64);
      const linhasData = doc.splitTextToSize(textoDaData(v), 40);
      const altura = Math.max(linhasNome.length, linhasData.length) * 5;
      espaco(altura + 4);
      pagina.y += 6;
      doc.setTextColor(30, 30, 30);
      doc.text(linhasNome, 14, pagina.y);
      doc.text(String(v.dose || ''), 82, pagina.y);
      doc.text(doc.splitTextToSize(String(v.periodo || ''), 34), 120, pagina.y);
      doc.text(linhasData, 158, pagina.y);
      pagina.y += altura - 5;
    });
  };

  secao('Em atraso', [220, 38, 38], atrasadas);
  secao('Próximas doses', [37, 99, 235], previstas);
  secao('Doses registradas', [22, 163, 74], aplicadas);

  // A carteira do app é declaratória (ver CLAUDE.md, "O que falta"): o PDF
  // precisa dizer isso, senão vira um comprovante que ele não é.
  espaco(20);
  pagina.y += 12;
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(
    doc.splitTextToSize(
      'As doses registradas foram lançadas por profissionais de saúde no Saúde Conecta. '
      + 'Uma dose sem registro aqui não quer dizer que ela não foi tomada: confira com a '
      + 'caderneta física ou com a unidade de saúde.',
      182,
    ),
    14,
    pagina.y,
  );

  fecharRelatorio(
    doc,
    'Documento gerado pelo Saúde Conecta. Não substitui a caderneta de vacinação oficial.',
    nomeDeArquivo('carteira-vacinacao', nome),
  );
}

