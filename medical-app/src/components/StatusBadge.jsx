import React from 'react';

// Rótulo exibido para cada status. A cor correspondente fica no app.css
// (.status-badge.normal, .limite, etc.) para manter tudo no mesmo padrão.
const ROTULOS = {
  normal: 'Normal',
  limite: 'Limite',
  alterado: 'Alterado',
  agendada: 'Agendada',
  realizada: 'Realizada',
  pendente: 'Pendente',
};

/**
 * Selo de situação usado em exames e consultas.
 *
 * @param {string} status  Uma das chaves de ROTULOS.
 * @param {string} [texto] Sobrescreve o rótulo padrão do status.
 */
export default function StatusBadge({ status, texto }) {
  return (
    <span className={`status-badge ${status}`}>
      {texto || ROTULOS[status] || status}
    </span>
  );
}
