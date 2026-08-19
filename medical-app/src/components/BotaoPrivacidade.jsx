import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacidade } from '../context/PrivacidadeContext';

/**
 * Botão do "olhinho": mostra ou esconde os dados sensíveis da tela.
 *
 * O estado é global (PrivacidadeContext), então fechar o olho no perfil também
 * esconde os resultados nos exames e no prontuário.
 *
 * @param {string} [rotulo] Nome do que está sendo escondido, usado no texto de
 *                          acessibilidade ("Mostrar meus dados").
 */
export default function BotaoPrivacidade({ rotulo = 'dados' }) {
  const { oculto, alternar } = usePrivacidade();
  const acao = oculto ? `Mostrar ${rotulo}` : `Ocultar ${rotulo}`;

  return (
    <button
      type="button"
      onClick={alternar}
      className="privacidade-btn"
      aria-pressed={!oculto}
      aria-label={acao}
      title={acao}
    >
      {oculto ? <EyeOff size={16} /> : <Eye size={16} />}
      <span>{oculto ? 'Mostrar' : 'Ocultar'}</span>
    </button>
  );
}
