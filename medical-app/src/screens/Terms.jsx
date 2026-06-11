import React from 'react';
import { ChevronLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TermsContent } from '../content/LegalContent';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <div className="flex items-center gap-4 mb-2">
        <div className="icon-box">
          <FileText size={24} />
        </div>
        <h2 className="header-title">Termos de Uso</h2>
      </div>
      <p className="header-subtitle mb-6">Última atualização: 09 de junho de 2026</p>

      <div className="card">
        <TermsContent />
      </div>
    </div>
  );
}
