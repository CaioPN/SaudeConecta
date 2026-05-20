import React from 'react';
import { AlertCircle, Heart, Clock, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MedicalRecord() {
  const navigate = useNavigate();
  
  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <h2 className="header-title">Prontuário</h2>
      <p className="header-subtitle mb-6">Gabriel Ferreira</p>

      <h3 className="section-title">Visão Geral</h3>
      <div className="quick-actions-grid mb-6">
        <div className="card card-sm border-red" style={{ marginBottom: 0 }}>
          <div className="flex items-center gap-4 text-red mb-2">
            <AlertCircle size={18} />
            <span className="font-bold text-sm">Alergias</span>
          </div>
          <p className="font-bold">Penicilina</p>
        </div>
        <div className="card card-sm border-blue" style={{ marginBottom: 0 }}>
          <div className="flex items-center gap-4 text-blue mb-2">
            <Heart size={18} />
            <span className="font-bold text-sm">Condições</span>
          </div>
          <p className="font-bold">Hipertensão</p>
        </div>
      </div>

      <h3 className="section-title">Registros Recentes</h3>
      <div className="timeline-container">
        <div className="timeline-item">
          <div className="timeline-dot"></div>
          <h4 className="font-bold">Consulta de Acompanhamento</h4>
          <p className="text-xs text-muted flex items-center mt-1"><Clock size={12} style={{marginRight: '4px'}}/> 15 Jan 2026</p>
          <p className="record-card">
            Pressão arterial controlada (120/80). Prescrição mantida sem alterações.
          </p>
        </div>
      </div>
    </div>
  );
}