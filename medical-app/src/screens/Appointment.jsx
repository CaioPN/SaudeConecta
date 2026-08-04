import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Info, ChevronLeft, User, Clock, FileText, Droplet } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import InfoField from '../components/InfoField';
import StatusBadge from '../components/StatusBadge';
import { buscarConsulta } from '../services/consultas';
import { formatarData } from '../utils/exames';

export default function Appointment() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [consulta, setConsulta] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    buscarConsulta(id)
      .then((c) => {
        if (ativo) setConsulta(c);
      })
      .catch(() => {
        if (ativo) setConsulta(null);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [id]);

  if (carregando || !consulta) {
    return (
      <div className="screen-container">
        <button onClick={() => navigate('/appointment')} className="back-btn">
          <ChevronLeft size={20} /> Voltar
        </button>
        <p className="empty-state">
          {carregando ? 'Carregando consulta…' : 'Consulta não encontrada.'}
        </p>
      </div>
    );
  }

  const realizada = consulta.status === 'realizada';

  return (
    <div className="screen-container">
      <button onClick={() => navigate('/appointment')} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <h2 className="header-title mb-6">Detalhes da Consulta</h2>

      <div className="card mb-6">
        <div className="detail-card-header">
          <div className="icon-box icon-box-lg" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <User size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 className="font-bold text-lg">{consulta.medico}</h3>
            <p className="text-sm font-bold text-primary">{consulta.especialidade}</p>
          </div>
          <StatusBadge status={consulta.status} />
        </div>

        <InfoField icon={Calendar} label="Data e hora">
          {formatarData(consulta.data)} • {consulta.hora}
        </InfoField>
        <InfoField icon={MapPin} label="Local">
          {consulta.local}
        </InfoField>
        <InfoField icon={Info} label="Motivo">
          {consulta.motivo}
        </InfoField>
      </div>

      {realizada && (consulta.resumo || consulta.conduta) && (
        <>
          <h3 className="section-title">Registro do atendimento</h3>
          <div className="card mb-6">
            {consulta.resumo && (
              <InfoField icon={FileText} label="Resumo">
                {consulta.resumo}
              </InfoField>
            )}
            {consulta.conduta && (
              <InfoField icon={Clock} label="Conduta">
                {consulta.conduta}
              </InfoField>
            )}
          </div>
        </>
      )}

      <div className="flex-col gap-4">
        {realizada && (
          <button onClick={() => navigate('/exams')} className="btn-secondary">
            <Droplet size={18} /> Ver exames
          </button>
        )}
        {/* TODO: ligar ao endpoint de reagendamento quando ele existir no ApiServer. */}
        {!realizada && <button className="btn-primary">Remarcar</button>}
      </div>
    </div>
  );
}
