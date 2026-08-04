import React from 'react';
import StatusBadge from './StatusBadge';
import {
  situacaoItem,
  posicaoNaFaixa,
  textoReferencia,
  FAIXA_INICIO,
  FAIXA_FIM,
} from '../utils/exames';

/**
 * Linha de resultado de exame: nome, valor, faixa de referência e situação.
 *
 * A régua abaixo mostra a faixa de referência como o bloco central (entre
 * FAIXA_INICIO e FAIXA_FIM) e o valor do paciente como um marcador na posição
 * calculada — diferente da barra antiga, que usava uma porcentagem fixa.
 */
export default function ResultRow({ item }) {
  const situacao = situacaoItem(item);
  const posicao = posicaoNaFaixa(item);

  return (
    <div className="result-row">
      <div className="result-row-top">
        <span className="result-nome">{item.nome}</span>
        <span className="result-valor">
          {item.valor.toLocaleString('pt-BR')}
          <span className="result-unidade"> {item.unidade}</span>
        </span>
      </div>

      <div className="result-regua" aria-hidden="true">
        <div
          className="result-regua-faixa"
          style={{ left: `${FAIXA_INICIO}%`, width: `${FAIXA_FIM - FAIXA_INICIO}%` }}
        />
        <div className={`result-regua-marcador ${situacao}`} style={{ left: `${posicao}%` }} />
      </div>

      <div className="result-row-bottom">
        <span className="result-referencia">Referência: {textoReferencia(item)}</span>
        <StatusBadge status={situacao} />
      </div>
    </div>
  );
}
