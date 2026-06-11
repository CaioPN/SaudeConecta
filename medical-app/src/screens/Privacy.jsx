import React from 'react';
import { ChevronLeft, Lock, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PrivacyContent } from '../content/LegalContent';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <div className="flex items-center gap-4 mb-2">
        <div className="icon-box">
          <Lock size={24} />
        </div>
        <h2 className="header-title">Portal de Privacidade</h2>
      </div>
      <p className="header-subtitle mb-6">Em conformidade com a LGPD (Lei nº 13.709/2018)</p>

      <div className="card border-blue" style={{ marginBottom: '16px' }}>
        <div className="flex items-center gap-4 text-blue mb-2">
          <ShieldCheck size={18} />
          <span className="font-bold text-sm">Seu compromisso com a sua privacidade</span>
        </div>
        <p className="text-sm text-muted">
          Levamos a proteção dos seus dados de saúde a sério. Esta política explica quais
          dados coletamos, como os utilizamos e quais são os seus direitos.
        </p>
      </div>

      <div className="card">
        <PrivacyContent />
      </div>
    </div>
  );
}
