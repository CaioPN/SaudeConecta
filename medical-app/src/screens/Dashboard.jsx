import React, { useEffect, useState } from 'react';
import { Search, Calendar, User, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { paciente } = useAuth();
  const [totalDependentes, setTotalDependentes] = useState(null);

  // Usa o primeiro nome do paciente logado; tem um fallback amigável.
  const primeiroNome = paciente?.nome ? paciente.nome.split(' ')[0] : 'Visitante';

  // Busca a quantidade real de dependentes cadastrados para o usuário logado.
  useEffect(() => {
    let ativo = true;
    api
      .get('/dependentes')
      .then(({ data }) => {
        if (ativo) setTotalDependentes(data.dependentes?.length ?? 0);
      })
      .catch(() => {
        if (ativo) setTotalDependentes(0);
      });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="screen-container">
      <header className="mb-6">
        <h1 className="header-title">Olá, {primeiroNome}!</h1>
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
          <h2 className="text-sm font-bold text-muted">Meus dependentes</h2>
          <p className="header-title text-primary mt-1">
            {totalDependentes === null ? '—' : totalDependentes}{' '}
            <span className="text-sm font-bold text-muted">
              {totalDependentes === 1 ? 'Ativo' : 'Ativos'}
            </span>
          </p>
        </div>
        <div className="icon-box">
          <User size={24} />
        </div>
      </div>
      
      <h3 className="section-title text-red mb-2">Avisos <AlertCircle size={18} /></h3>
      <div className="card">
        <p className="text-sm text muted">Mais de 1 ano desde o último check-up!</p>
        <p className="text-sm text-muted">Não há outros avisos no momento.</p>
      </div>

      <h3 className="section-title">Ações Rápidas</h3>
      <div className="quick-actions-grid">
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