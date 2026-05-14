import React from 'react';
import { User, FileText, Syringe, Activity, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PatientProfile() {
  const navigate = useNavigate();
  
  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <div className="card profile-header">
        <div className="profile-avatar">
          <User size={40} />
        </div>
        <h2 className="header-title" style={{ fontSize: '20px' }}>Maria Eduarda Silva</h2>
        <p className="text-sm text-muted">32 anos • ID: #99482</p>
      </div>

      <h3 className="section-title">Acessos Rápidos</h3>
      <div className="flex-col gap-4">
        <button onClick={() => navigate('/record')} className="list-action-btn">
          <div className="icon-box icon-box-lg">
            <FileText size={26} />
          </div>
          <div>
            <h4 className="font-bold">Dados da Consulta</h4>
            <p className="text-sm text-muted">Prontuário e histórico</p>
          </div>
        </button>

        <button onClick={() => navigate('/exams')} className="list-action-btn">
          <div className="icon-box icon-box-lg">
            <Activity size={26} />
          </div>
          <div>
            <h4 className="font-bold">Exames</h4>
            <p className="text-sm text-muted">Resultados e imagens</p>
          </div>
        </button>

        <button className="list-action-btn">
          <div className="icon-box icon-box-lg">
            <Syringe size={26} />
          </div>
          <div>
            <h4 className="font-bold">Carteira de Vacinação</h4>
            <p className="text-sm text-muted">Registro de imunizações</p>
          </div>
        </button>
      </div>
    </div>
  );
}