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

      <div className="card">
        <div className="flex items-center gap-4 mb-6" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '24px' }}>
          <div className="icon-box icon-box-lg">
            <User size={28} />
          </div>
          <div>
            <h3 className="font-bold" style={{ fontSize: '18px' }}>Dr. Gabriel Ferreira</h3>
            <p className="text-primary font-bold text-sm">Clínico Geral</p>
          </div>
        </div>

        <div className="flex-col gap-4">
          <div className="flex items-center gap-4">
            <Calendar className="text-muted" size={22} />
            <div>
              <p className="text-xs text-muted font-bold mb-2">Data e Hora</p>
              <p className="font-bold">23 Fev 2026 • 14:30</p>
            </div>
          </div>
          <div className="flex items-center gap-4" style={{ marginTop: '16px' }}>
            <MapPin className="text-muted" size={22} />
            <div>
              <p className="text-xs text-muted font-bold mb-2">Local</p>
              <p className="font-bold">Edifício Saúde, Sala 402</p>
            </div>
          </div>
          <div className="flex items-center gap-4" style={{ marginTop: '16px' }}>
            <Info className="text-muted" size={22} />
            <div>
              <p className="text-xs text-muted font-bold mb-2">Motivo</p>
              <p className="font-bold">Retorno (Follow-up)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button className="btn-primary">Iniciar Atendimento</button>
        <button className="btn-secondary">Remarcar</button>
      </div>
    </div>
  );
}