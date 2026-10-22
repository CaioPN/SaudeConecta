import React from 'react';
import useVoltar from '../hooks/useVoltar';
import { ChevronLeft, FileText } from 'lucide-react';
import { TermsContent, DATA_TERMOS } from '../content/LegalContent';

export default function Terms() {
  const voltar = useVoltar('/');

  return (
    <div className="screen-container tela-rolagem">
      <div className="tela-topo">
      <button onClick={() => voltar()} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <div className="flex items-center gap-4 mb-2">
        <div className="icon-box">
          <FileText size={24} />
        </div>
        <h2 className="header-title">Termos de Uso</h2>
      </div>
      <p className="header-subtitle mb-6">Versão de {DATA_TERMOS} · o aceite fica em Mais › Meus dados</p>
      </div>

      <div className="tela-lista">

      <div className="card">
        <TermsContent />
      </div>
      </div>
    </div>
  );
}
