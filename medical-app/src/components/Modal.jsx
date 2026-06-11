import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// Janelinha (modal) exibida sobre a página atual, sem abrir nova aba/janela.
// O corpo tem rolagem própria para textos longos.
export default function Modal({ open, title, onClose, children }) {
  // Fecha com a tecla Esc e trava a rolagem do fundo enquanto aberto.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
