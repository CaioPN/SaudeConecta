import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { listarConsultas } from '../services/consultas';
import { mesAbreviado } from '../utils/exames';

function ConsultaItem({ consulta, onClick }) {
  return (
    <button className="consulta-item" onClick={onClick}>
      <div className="consulta-item-data">
        <span className="consulta-item-dia">{consulta.data.slice(8, 10)}</span>
        <span className="consulta-item-mes">{mesAbreviado(consulta.data)}</span>
      </div>

      <div className="consulta-item-body">
        <div className="consulta-item-top">
          <span className="font-bold">{consulta.medico}</span>
          <StatusBadge status={consulta.status} />
        </div>
        <span className="consulta-item-espec">{consulta.especialidade}</span>
        <span className="consulta-item-meta">
          <Calendar size={12} /> {consulta.hora} · <MapPin size={12} /> {consulta.local}
        </span>
      </div>

      <ChevronRight size={18} className="text-muted" />
    </button>
  );
}

export default function Appointments() {
  const navigate = useNavigate();
  const [consultas, setConsultas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;
    listarConsultas()
      .then((lista) => {
        if (ativo) setConsultas(lista);
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar suas consultas.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  // A API devolve da mais recente para a mais antiga; as próximas ficam em
  // ordem crescente para que a consulta mais perto de acontecer venha primeiro.
  const proximas = consultas.filter((c) => c.status === 'agendada').slice().reverse();
  const anteriores = consultas.filter((c) => c.status !== 'agendada');

  const abrir = (id) => navigate(`/appointment/${id}`);

  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <h2 className="header-title mb-2">Consultas</h2>
      <p className="text-sm text-muted mb-6">Seus agendamentos e atendimentos anteriores</p>

      {carregando && <p className="empty-state">Carregando consultas…</p>}
      {erro && !carregando && <p className="empty-state">{erro}</p>}

      {!carregando && !erro && (
        <>
          <h3 className="section-title">Próximas</h3>
          {proximas.length === 0 ? (
            <p className="empty-state">Nenhuma consulta agendada.</p>
          ) : (
            proximas.map((c) => <ConsultaItem key={c.id} consulta={c} onClick={() => abrir(c.id)} />)
          )}

          <h3 className="section-title" style={{ marginTop: '24px' }}>Anteriores</h3>
          {anteriores.length === 0 ? (
            <p className="empty-state">Nenhum atendimento registrado.</p>
          ) : (
            anteriores.map((c) => <ConsultaItem key={c.id} consulta={c} onClick={() => abrir(c.id)} />)
          )}
        </>
      )}
    </div>
  );
}
