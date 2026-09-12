import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import SeletorPessoa from '../components/SeletorPessoa';
import Modal from '../components/Modal';
import FormularioConsulta from '../components/FormularioConsulta';
import { usePessoas } from '../context/PessoasContext';
import { usePrivacidade } from '../context/PrivacidadeContext';
import { mascararTexto } from '../utils/privacidade';
import { listarConsultas } from '../services/consultas';
import { mesAbreviado } from '../utils/exames';

// "2026-04-12" — comparação de texto resolve, porque o formato ISO ordena
// igual à data. Evita o new Date(), que interpretaria a string como UTC.
function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ConsultaItem({ consulta, onClick, oculto }) {
  // Com o olho fechado somem o profissional, a especialidade e o local: a
  // especialidade é o campo que mais entrega ("Oncologia" já é meio
  // diagnóstico), e o local diz onde a pessoa esteve. A data e a situação
  // ficam — servem para o paciente achar a consulta na lista e não contam
  // nada sobre o que ele tem.
  return (
    <button className="consulta-item" onClick={onClick}>
      <div className="consulta-item-data">
        <span className="consulta-item-dia">{consulta.data.slice(8, 10)}</span>
        <span className="consulta-item-mes">{mesAbreviado(consulta.data)}</span>
      </div>

      <div className="consulta-item-body">
        <div className="consulta-item-top">
          <span className={`font-bold ${oculto ? 'valor-oculto' : ''}`}>
            {oculto ? mascararTexto(consulta.medico) : consulta.medico}
          </span>
          <StatusBadge status={consulta.status} />
        </div>
        {/* Quem anotou. Sem isto, a consulta que o paciente digitou ficaria
            igual ao atendimento registrado pelo profissional — e as duas coisas
            valem coisas diferentes na hora de mostrar a alguém. */}
        {consulta.origem === 'paciente' && (
          <span className="consulta-item-origem">anotado por você</span>
        )}
        <span className={`consulta-item-espec ${oculto ? 'valor-oculto' : ''}`}>
          {oculto ? mascararTexto(consulta.especialidade) : consulta.especialidade}
        </span>
        <span className="consulta-item-meta">
          <Calendar size={12} /> {consulta.hora} · <MapPin size={12} />{' '}
          <span className={oculto ? 'valor-oculto' : ''}>
            {oculto ? mascararTexto(consulta.local) : consulta.local}
          </span>
        </span>
      </div>

      <ChevronRight size={18} className="text-muted" />
    </button>
  );
}

export default function Appointments() {
  const navigate = useNavigate();
  const { pessoa, dependenteId } = usePessoas();
  const { oculto } = usePrivacidade();
  const [consultas, setConsultas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [anotando, setAnotando] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    return listarConsultas(dependenteId)
      .then(setConsultas)
      .catch(() => setErro('Não foi possível carregar as consultas.'))
      .finally(() => setCarregando(false));
  }, [dependenteId]);

  useEffect(() => { carregar(); }, [carregar]);

  // A API devolve da mais recente para a mais antiga; as próximas ficam em
  // ordem crescente para que a consulta mais perto de acontecer venha primeiro.
  //
  // O corte não é só pelo status: a consulta anotada pelo paciente continua
  // "agendada" para sempre, porque ninguém volta ao app para dizer que foi.
  // Sem olhar a data, a consulta do mês passado ficaria encalhada no topo,
  // em "Próximas", empurrando a de amanhã para baixo.
  const hoje = hojeIso();
  const emAberto = (c) => c.status === 'agendada' && c.data >= hoje;
  const proximas = consultas.filter(emAberto).slice().reverse();
  const anteriores = consultas.filter((c) => !emAberto(c));

  const abrir = (id) => navigate(`/appointment/${id}`);

  return (
    <div className="screen-container tela-rolagem">
      {/* Cabeçalho e seletor de pessoa ficam parados; só a lista rola. */}
      <div className="tela-topo">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ChevronLeft size={20} /> Voltar
        </button>

        <div className="section-header">
          <div>
            <h2 className="header-title mb-2">Consultas</h2>
            <p className="text-sm text-muted">Agendamentos e atendimentos anteriores</p>
          </div>
          <BotaoPrivacidade rotulo="consultas" />
        </div>

        <SeletorPessoa />

        {/* O app não agenda nada — mas é o paciente quem sabe o que marcou na
            unidade, e sem este botão a tela só mostrava o que o profissional
            tinha registrado depois do atendimento. */}
        <button className="btn-primary mb-6" onClick={() => setAnotando(true)}>
          <Plus size={18} /> Anotar consulta marcada
        </button>
      </div>

      <div className="tela-lista">
      {carregando && <p className="empty-state">Carregando consultas…</p>}
      {erro && !carregando && <p className="empty-state">{erro}</p>}

      {!carregando && !erro && (
        <>
          <h3 className="section-title">Próximas</h3>
          {proximas.length === 0 ? (
            <p className="empty-state">Nenhuma consulta agendada.</p>
          ) : (
            proximas.map((c) => (
              <ConsultaItem key={c.id} consulta={c} oculto={oculto} onClick={() => abrir(c.id)} />
            ))
          )}

          <h3 className="section-title" style={{ marginTop: '24px' }}>Anteriores</h3>
          {anteriores.length === 0 ? (
            <p className="empty-state">Nenhum atendimento registrado.</p>
          ) : (
            anteriores.map((c) => (
              <ConsultaItem key={c.id} consulta={c} oculto={oculto} onClick={() => abrir(c.id)} />
            ))
          )}
        </>
      )}
      </div>

      <Modal
        open={anotando}
        title={pessoa.titular ? 'Anotar consulta' : `Anotar consulta de ${pessoa.nome.split(' ')[0]}`}
        onClose={() => setAnotando(false)}
      >
        <FormularioConsulta
          dependenteId={dependenteId}
          onPronto={() => { setAnotando(false); carregar(); }}
          onCancelar={() => setAnotando(false)}
        />
      </Modal>
    </div>
  );
}
