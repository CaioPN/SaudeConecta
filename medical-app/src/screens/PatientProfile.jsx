import React from 'react';
import { User, FileText, Syringe, Activity, ChevronLeft, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Calcula a idade a partir da data de nascimento (formato ISO).
function calcularIdade(dataNascimento) {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento);
  if (Number.isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

export default function PatientProfile() {
  const navigate = useNavigate();
  const { paciente } = useAuth();

  const nome = paciente?.nome || 'Paciente';
  const idade = calcularIdade(paciente?.data_nascimento);
  const detalhes = [idade != null ? `${idade} anos` : null, paciente?.id ? `ID: #${paciente.id}` : null]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <div className="card profile-header">
        <div className="profile-avatar">
          <User size={40} />
        </div>
        <h2 className="header-title" style={{ fontSize: '20px' }}>{nome}</h2>
        <p className="text-sm text-muted">{detalhes || 'Dados do paciente'}</p>
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

        <button onClick={() => navigate('/dependentes')} className="list-action-btn">
          <div className="icon-box icon-box-lg">
            <Users size={26} />
          </div>
          <div>
            <h4 className="font-bold">Dependentes</h4>
            <p className="text-sm text-muted">Familiares vinculados à conta</p>
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
