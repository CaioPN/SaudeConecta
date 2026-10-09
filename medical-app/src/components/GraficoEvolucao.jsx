import React from 'react';
import StatusBadge from './StatusBadge';
import { formatarData, mesAbreviado, textoReferencia } from '../utils/exames';

// Área de desenho, em unidades do viewBox. O SVG estica para a largura do
// cartão, então isto é proporção, não pixel.
const LARGURA = 320;
const ALTURA = 180;
const MARGEM = { topo: 22, direita: 16, base: 28, esquerda: 40 };

const numero = (v) => Number(v).toLocaleString('pt-BR');

// "2026-07-16" -> "jul/26": cabe embaixo do ponto sem encavalar.
const dataCurta = (iso) => `${mesAbreviado(iso)}/${String(iso).slice(2, 4)}`;

/**
 * Faixa do eixo Y. Cobre todos os valores e a faixa de referência da coleta
 * mais recente — mas só a borda de baixo dela quando ela não é zero: numa
 * referência "até 200" (colesterol), incluir o zero achataria a linha inteira
 * no topo do gráfico, e a variação entre 178 e 196 sumiria.
 */
function dominioY(pontos) {
  const ultimo = pontos[pontos.length - 1];
  const valores = pontos.map((p) => p.valor).concat(ultimo.max);
  if (ultimo.min > 0) valores.push(ultimo.min);
  let baixo = Math.min(...valores);
  let alto = Math.max(...valores);
  const folga = (alto - baixo) * 0.15 || Math.abs(alto) * 0.1 || 1;
  baixo -= folga;
  alto += folga;
  // Exame não tem valor negativo: a folga não pode inventar um.
  if (baixo < 0 && Math.min(...pontos.map((p) => p.valor)) >= 0) baixo = 0;
  return [baixo, alto];
}

/**
 * Gráfico da evolução de um item de exame ao longo das coletas.
 *
 * Desenhado à mão em SVG, sem biblioteca de gráfico: são uma faixa, uma linha
 * e alguns pontos, e uma dependência a mais precisaria ser justificada no
 * trabalho. O eixo X é proporcional ao TEMPO, não à ordem — três coletas em
 * um ano e meio com intervalos diferentes não podem parecer igualmente
 * espaçadas.
 *
 * A faixa sombreada é a referência da coleta mais recente; a cor de cada ponto
 * é a situação daquele resultado na faixa do laboratório DELE. A tabela embaixo
 * repete tudo em texto, para leitor de tela e para quem prefere o número.
 *
 * O gráfico mostra; não interpreta. Nenhuma frase aqui diz "melhorou" ou
 * "piorou" — isso é leitura clínica, e o app deixa para o profissional.
 */
export default function GraficoEvolucao({ nome, pontos }) {
  const ultimo = pontos[pontos.length - 1];
  const [yMin, yMax] = dominioY(pontos);

  const tempos = pontos.map((p) => Date.parse(p.data));
  const tMin = Math.min(...tempos);
  const tMax = Math.max(...tempos);
  const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;

  const x = (t) => (tMax === tMin
    ? MARGEM.esquerda + larguraUtil / 2
    : MARGEM.esquerda + ((t - tMin) / (tMax - tMin)) * larguraUtil);
  const y = (v) => MARGEM.topo + (1 - (v - yMin) / (yMax - yMin)) * alturaUtil;
  // Prende a faixa dentro da área: uma referência "até 200" com o eixo
  // começando em 170 não pode desenhar para fora do gráfico.
  const yPreso = (v) => Math.min(ALTURA - MARGEM.base, Math.max(MARGEM.topo, y(v)));

  const faixaTopo = yPreso(ultimo.max);
  const faixaBase = yPreso(ultimo.min);
  const coords = pontos.map((p, i) => ({ ...p, cx: x(tempos[i]), cy: y(p.valor) }));
  const linha = coords.map((c) => `${c.cx},${c.cy}`).join(' ');

  const descricao = `${nome}: ${pontos.length} resultados, de ${formatarData(pontos[0].data)} a `
    + `${formatarData(ultimo.data)}. ${coords.map((c) => `${formatarData(c.data)}, ${numero(c.valor)} ${c.unidade}`).join('; ')}.`;

  return (
    <div className="evolucao">
      <svg
        className="evolucao-grafico"
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        role="img"
        aria-label={descricao}
      >
        <rect
          className="evolucao-faixa"
          x={MARGEM.esquerda}
          y={faixaTopo}
          width={larguraUtil}
          height={Math.max(0, faixaBase - faixaTopo)}
        />
        {/* Bordas da referência, escritas no eixo: é por elas que se lê se um
            ponto está dentro ou fora. */}
        {y(ultimo.max) >= MARGEM.topo && (
          <text className="evolucao-eixo" x={MARGEM.esquerda - 6} y={faixaTopo + 4} textAnchor="end">
            {numero(ultimo.max)}
          </text>
        )}
        {ultimo.min > 0 && y(ultimo.min) <= ALTURA - MARGEM.base && (
          <text className="evolucao-eixo" x={MARGEM.esquerda - 6} y={faixaBase + 4} textAnchor="end">
            {numero(ultimo.min)}
          </text>
        )}
        <line
          className="evolucao-base"
          x1={MARGEM.esquerda}
          x2={LARGURA - MARGEM.direita}
          y1={ALTURA - MARGEM.base}
          y2={ALTURA - MARGEM.base}
        />

        <polyline className="evolucao-linha" points={linha} />

        {coords.map((c, i) => (
          <g key={`${c.data}-${i}`}>
            <circle className={`evolucao-ponto ${c.situacao}`} cx={c.cx} cy={c.cy} r={5} />
            <text className="evolucao-valor" x={c.cx} y={c.cy - 10} textAnchor="middle">
              {numero(c.valor)}
            </text>
            <text className="evolucao-eixo" x={c.cx} y={ALTURA - MARGEM.base + 16} textAnchor="middle">
              {dataCurta(c.data)}
            </text>
          </g>
        ))}
      </svg>

      <p className="evolucao-legenda">
        <span className="evolucao-legenda-faixa" /> Faixa de referência da coleta mais recente
        ({textoReferencia(ultimo)})
      </p>

      <table className="evolucao-tabela">
        <thead>
          <tr><th>Coleta</th><th>Resultado</th><th>Situação</th></tr>
        </thead>
        <tbody>
          {[...pontos].reverse().map((p, i) => (
            <tr key={`${p.data}-${i}`}>
              <td>{formatarData(p.data)}</td>
              <td>{numero(p.valor)} {p.unidade}</td>
              <td><StatusBadge status={p.situacao} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="explicacao-rodape">
        O gráfico mostra os valores registrados nas suas coletas. Quem interpreta a
        evolução é o profissional de saúde.
      </p>
    </div>
  );
}
