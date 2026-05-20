import React from 'react';
import { Calendar, MapPin, Info, ChevronLeft, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Appointment() {
  const navigate = useNavigate();
  
  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <h2 className="header-title mb-6">Detalhes da Consulta</h2>

      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <div className="icon-box icon-box-lg" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <User size={28} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Maria Gabriela</h3>
            <p className="text-sm font-bold text-primary" style={{ color: '#2563eb' }}>Clínico Geral</p>
          </div>
        </div>

        <div className="flex-col gap-4">
          <div className="flex items-start gap-4">
            <Calendar className="text-muted" size={22} />
            <div>
              <p className="text-xs text-muted font-bold uppercase mb-1">Data e Hora</p>
              <p className="font-bold">23 Fev 2026 • 14:30</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <MapPin className="text-muted" size={22} />
            <div>
              <p className="text-xs text-muted font-bold uppercase mb-1">Local</p>
              <p className="font-bold">Edifício Saúde, Sala 402</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Info className="text-muted" size={22} />
            <div>
              <p className="text-xs text-muted font-bold uppercase mb-1">Motivo</p>
              <p className="font-bold">Retorno (Follow-up)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-col gap-4">
        <button className="btn-primary">Iniciar Atendimento</button>
        <button className="btn-primary" style={{ backgroundColor: '#ffffff', color: '#374151', border: '1px solid #e5e7eb' }}>Remarcar</button>
      </div>
    </div>
  );
}