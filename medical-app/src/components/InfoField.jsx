import React from 'react';

/**
 * Par rótulo + valor usado nas telas de detalhe (consulta, exame, prontuário).
 * Centraliza o espaçamento e a tipografia que antes eram repetidos em cada tela.
 *
 * @param {React.ElementType} [icon]  Ícone do lucide-react exibido à esquerda.
 */
export default function InfoField({ icon: Icon, label, children }) {
  return (
    <div className="info-field">
      {Icon && (
        <div className="info-field-icon">
          <Icon size={18} />
        </div>
      )}
      <div className="info-field-body">
        <span className="info-field-label">{label}</span>
        <span className="info-field-value">{children}</span>
      </div>
    </div>
  );
}
