import React from 'react';
import { Search, FilePlus, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  
  return (
    <div className="screen-container">
      <header className="mb-6">
        <h1 className="header-title">Olá, Dr. Gabriel Ferreira!</h1>
        <p className="header-subtitle">Resumo de hoje</p>
      </header>

      <div className="search-wrapper">
        <Search className="search-icon" size={20} />
        <input type="text" placeholder="Buscar pacientes..." className="search-input" />
      </div>

      <div
        className="card patient-summary"
        onClick={() => navigate('/patient')}
      >
        <div>
          <h2 className="text-sm font-bold text-muted">Meus Pacientes</h2>
          <p className="header-title text-primary mt-1">24 <span className="text-sm font-bold text-muted">Ativos</span></p>
        </div>
        <div className="icon-box">
          <User size={24} />
        </div>
      </div>

      <h3 className="section-title">Ações Rápidas</h3>
      <div className="quick-actions-grid">
        <button className="action-btn">
          <div className="icon-box">
            <FilePlus size={24} />
          </div>
          <span className="font-bold text-sm">Novo Prontuário</span>
        </button>
        <button onClick={() => navigate('/appointment')} className="action-btn">
          <div className="icon-box icon-box-gray">
            <Calendar size={24} />
          </div>
          <span className="font-bold text-sm">Agendamentos</span>
        </button>
      </div>
    </div>
  );
}