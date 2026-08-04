// Regras de leitura de exames: como classificar um resultado diante da faixa
// de referência e como posicioná-lo na régua da tela. São funções puras — os
// dados vêm da API (ver services/exames.js).

/**
 * Classifica um item de exame comparando o valor com a faixa de referência.
 *
 * @returns {'normal'|'limite'|'alterado'}
 *   'alterado' fora da faixa; 'limite' quando está dentro mas a menos de 10%
 *   da amplitude de uma das bordas; 'normal' no resto.
 */
export function situacaoItem({ valor, min, max }) {
  if (valor < min || valor > max) return 'alterado';
  const margem = (max - min) * 0.1;
  if (valor - min <= margem || max - valor <= margem) return 'limite';
  return 'normal';
}

/**
 * Posição do valor (0–100%) numa escala que mostra a faixa de referência
 * ocupando o miolo do trilho — de FAIXA_INICIO a FAIXA_FIM. Assim um valor
 * fora da referência aparece visivelmente fora do bloco destacado.
 */
export const FAIXA_INICIO = 20;
export const FAIXA_FIM = 80;

export function posicaoNaFaixa({ valor, min, max }) {
  const amplitude = max - min;
  // Folga de 25% da amplitude em cada ponta, o que põe min/max em 20% e 80%.
  const escalaMin = min - amplitude * 0.25;
  const escalaMax = max + amplitude * 0.25;
  const posicao = ((valor - escalaMin) / (escalaMax - escalaMin)) * 100;
  return Math.min(100, Math.max(0, posicao));
}

/** Texto da faixa de referência ("até 200 mg/dL" quando o mínimo é zero). */
export function textoReferencia({ min, max, unidade }) {
  return min === 0 ? `até ${max} ${unidade}` : `${min} – ${max} ${unidade}`;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * Formata uma data ISO (YYYY-MM-DD) como "15 jan 2026".
 * Feito à mão porque o toLocaleDateString do pt-BR devolve "15 de jan. de 2026".
 */
export function formatarData(dataIso) {
  const [ano, mes, dia] = String(dataIso).split('-');
  if (!ano || !mes || !dia) return dataIso;
  return `${dia} ${MESES[Number(mes) - 1]} ${ano}`;
}

/** Mês abreviado de uma data ISO ("jan"), usado no cartão de consulta. */
export function mesAbreviado(dataIso) {
  const mes = Number(String(dataIso).split('-')[1]);
  return MESES[mes - 1] || '';
}

/** Quantos itens da coleta estão fora da faixa de referência. */
export function totalAlterados(coleta) {
  return coleta.itens.filter((i) => situacaoItem(i) === 'alterado').length;
}
