import React, { useState } from 'react';
import Modal from './Modal';

// Janela "Deseja excluir...?" antes de apagar algo que não volta. Usa o Modal
// do app, e não o window.confirm do navegador, para ter o mesmo visual, o
// ajuste de fonte e o modo escuro.
//
// `onConfirmar` pode devolver uma promessa: enquanto ela não termina, os
// botões ficam travados, para um segundo toque não mandar a exclusão duas vezes.
export default function ConfirmarExclusao({ aberto, titulo, mensagem, aviso, onConfirmar, onCancelar }) {
  const [excluindo, setExcluindo] = useState(false);

  const confirmar = async () => {
    setExcluindo(true);
    try {
      await onConfirmar();
    } finally {
      setExcluindo(false);
    }
  };

  // Fechar pelo X, pelo Esc ou tocando fora vale como "Cancelar" — exceto no
  // meio da exclusão, que já foi pedida.
  const fechar = () => {
    if (!excluindo) onCancelar();
  };

  return (
    <Modal open={aberto} title={titulo} onClose={fechar}>
      <p className="confirmar-mensagem">{mensagem}</p>
      {aviso && <p className="confirmar-aviso">{aviso}</p>}
      <div className="confirmar-botoes">
        <button type="button" className="btn-secondary" onClick={fechar} disabled={excluindo}>
          Cancelar
        </button>
        <button type="button" className="btn-excluir" onClick={confirmar} disabled={excluindo}>
          {excluindo ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
    </Modal>
  );
}
