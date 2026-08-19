import React from 'react';
import StatusBadge from './StatusBadge';
import { usePrivacidade } from '../context/PrivacidadeContext';
import { mascararValor } from '../utils/privacidade';
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
 *
 * Com o olhinho fechado, o valor vira máscara e o marcador some: a posição na
 * régua e a cor do selo entregariam o resultado mesmo com o número escondido.
 * O nome do exame e a faixa de referência ficam, porque não são dado pessoal.
 */
export default function ResultRow({ item }) {
  const { oculto } = usePrivacidade();
  const situacao = situacaoItem(item);
  const posicao = posicaoNaFaixa(item);

  return (
    <div className="result-row">
      <div className="result-row-top">
        <span className="result-nome">{item.nome}</span>
        <span className={`result-valor ${oculto ? 'valor-oculto' : ''}`}>
          {oculto ? mascararValor() : item.valor.toLocaleString('pt-BR')}
          <span className="result-unidade"> {item.unidade}</span>
        </span>
      </div>

      <div className="result-regua" aria-hidden="true">
        <div
          className="result-regua-faixa"
          style={{ left: `${FAIXA_INICIO}%`, width: `${FAIXA_FIM - FAIXA_INICIO}%` }}
        />
        {!oculto && (
          <div className={`result-regua-marcador ${situacao}`} style={{ left: `${posicao}%` }} />
        )}
      </div>

      <div className="result-row-bottom">
        <span className="result-referencia">Referência: {textoReferencia(item)}</span>
        {oculto ? <span className="status-badge oculto">•••</span> : <StatusBadge status={situacao} />}
      </div>
    </div>
  );
}
