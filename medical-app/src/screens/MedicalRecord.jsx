import React, { useEffect, useState } from 'react';
import { AlertCircle, Heart, Clock, ChevronLeft, Pill, Stethoscope, Droplet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePrivacidade } from '../context/PrivacidadeContext';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import { mascararTexto } from '../utils/privacidade';
import { buscarProntuario } from '../services/prontuario';
import { listarConsultas } from '../services/consultas';
import { buscarExames } from '../services/exames';
import { montarLinhaDoTempo } from '../utils/prontuario';

// Ícone de cada tipo de evento da linha do tempo.
const ICONES = { consulta: Stethoscope, exame: Droplet };

export default function MedicalRecord() {
  const navigate = useNavigate();
  const { paciente } = useAuth();
  const { oculto } = usePrivacidade();
  const [prontuario, setProntuario] = useState({ alergias: [], condicoes: [], medicacoes: [] });
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;
    // O prontuário reúne três origens: dados fixos (alergias/condições/
    // medicações), consultas e exames — que juntos formam a linha do tempo.
    Promise.all([buscarProntuario(), listarConsultas(), buscarExames()])
      .then(([dados, consultas, { coletas, imagem }]) => {
        if (!ativo) return;
        setProntuario(dados);
        setEventos(montarLinhaDoTempo(consultas, coletas, imagem));
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar seu prontuário.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const { alergias, condicoes, medicacoes } = prontuario;

  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <div className="section-header">
        <div>
          <h2 className="header-title">Prontuário</h2>
          <p className="header-subtitle">{paciente?.nome || 'Paciente'}</p>
        </div>
        <BotaoPrivacidade rotulo="prontuário" />
      </div>

      {carregando && <p className="empty-state">Carregando prontuário…</p>}
      {erro && !carregando && <p className="empty-state">{erro}</p>}

      {!carregando && !erro && (
        <>
          <h3 className="section-title">Visão Geral</h3>
          <div className="quick-actions-grid mb-6">
            <div className="card card-sm border-red" style={{ marginBottom: 0 }}>
              <div className="flex items-center gap-4 text-red mb-2">
                <AlertCircle size={18} />
                <span className="font-bold text-sm">Alergias</span>
              </div>
              {alergias.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma registrada</p>
              ) : (
                alergias.map((a) => (
                  <p key={a.id} className={`font-bold ${oculto ? 'valor-oculto' : ''}`}>
                    {oculto ? mascararTexto(a.descricao) : a.descricao}
                  </p>
                ))
              )}
            </div>

            <div className="card card-sm border-blue" style={{ marginBottom: 0 }}>
              <div className="flex items-center gap-4 text-blue mb-2">
                <Heart size={18} />
                <span className="font-bold text-sm">Condições</span>
              </div>
              {condicoes.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma registrada</p>
              ) : (
                condicoes.map((c) => (
                  <p key={c.id} className={`font-bold ${oculto ? 'valor-oculto' : ''}`}>
                    {oculto ? mascararTexto(c.descricao) : c.descricao}
                  </p>
                ))
              )}
            </div>
          </div>

          {medicacoes.length > 0 && (
            <>
              <h3 className="section-title">Medicações em uso</h3>
              <div className="card">
                {medicacoes.map((m) => (
                  <div key={m.id} className="medicacao-item">
                    <div className="icon-box icon-box-gray"><Pill size={18} /></div>
                    <div>
                      <p className={`font-bold ${oculto ? 'valor-oculto' : ''}`}>
                        {oculto ? mascararTexto(m.nome) : `${m.nome} ${m.dosagem}`}
                      </p>
                      <p className={`text-xs text-muted ${oculto ? 'valor-oculto' : ''}`}>
                        {oculto ? mascararTexto(m.posologia) : m.posologia}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <h3 className="section-title">Histórico</h3>
          {eventos.length === 0 ? (
            <p className="empty-state">Nenhum registro no prontuário ainda.</p>
          ) : (
            <div className="timeline-container">
              {eventos.map((evento) => {
                const Icone = ICONES[evento.tipo] || Stethoscope;
                return (
                  <div key={evento.id} className="timeline-item">
                    <div className={`timeline-dot ${evento.tipo}`}>
                      <Icone size={10} />
                    </div>

                    <div className="timeline-head">
                      <h4 className={`font-bold ${oculto ? 'valor-oculto' : ''}`}>
                        {oculto ? mascararTexto(evento.titulo) : evento.titulo}
                      </h4>
                      <span className="text-xs text-muted flex items-center">
                        <Clock size={12} style={{ marginRight: '4px' }} /> {evento.dataFormatada}
                      </span>
                    </div>
                    <p className="text-xs text-muted">{evento.subtitulo}</p>

                    {evento.descricao && (
                      <button className="record-card" onClick={() => navigate(evento.rota)}>
                        {oculto ? (
                          <span className="valor-oculto">{mascararTexto(evento.descricao)}</span>
                        ) : (
                          <span className={evento.alerta ? 'text-red font-bold' : ''}>{evento.descricao}</span>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
