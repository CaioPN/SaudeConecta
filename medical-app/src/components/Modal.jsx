import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  // Vai para o <body>, e não para dentro da tela que o abriu: o .app-content
  // tem z-index próprio (por causa da marca d'água do logotipo), e isso prende
  // tudo o que está dentro dele num nível abaixo do botão do chatbot — a
  // janela abria por baixo do botão. Como o overlay é position: fixed, sair do
  // lugar na árvore não muda nada no desenho.
  return createPortal(
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
    </div>,
    document.body,
  );
}
