import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar, MapPin, Info, ChevronLeft, User, Clock, FileText, Droplet, Navigation,
  Pencil, Trash2, CalendarPlus, CheckCircle2, XCircle,
} from 'lucide-react';
import { buscarDetalhesUnidade } from '../services/redeSaude';
import { useNavigate, useParams } from 'react-router-dom';
import InfoField from '../components/InfoField';
import StatusBadge from '../components/StatusBadge';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import Modal from '../components/Modal';
import FormularioConsulta from '../components/FormularioConsulta';
import { usePrivacidade } from '../context/PrivacidadeContext';
import { mascararTexto } from '../utils/privacidade';
import { buscarConsulta, excluirConsulta, definirSituacao } from '../services/consultas';
import { formatarData } from '../utils/exames';

export default function Appointment() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { oculto } = usePrivacidade();
  const [consulta, setConsulta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [anotandoRetorno, setAnotandoRetorno] = useState(false);
  const [erroAcao, setErroAcao] = useState(null);
  const [salvando, setSalvando] = useState(false);
  // Unidade da rede onde a consulta acontece, quando há vínculo. Vem de uma
  // segunda chamada porque a consulta guarda só o código do CNES — o endereço
  // e a coordenada moram no espelho da Rede de Saúde.
  const [unidade, setUnidade] = useState(null);

  const recarregar = useCallback(() => {
    setCarregando(true);
    return buscarConsulta(id)
      .then(setConsulta)
      .catch(() => setConsulta(null))
      .finally(() => setCarregando(false));
  }, [id]);

  useEffect(() => { recarregar(); }, [recarregar]);

  useEffect(() => {
    if (!consulta?.unidadeCnes) {
      setUnidade(null);
      return undefined;
    }
    let ativo = true;
    buscarDetalhesUnidade(consulta.unidadeCnes)
      .then((u) => { if (ativo) setUnidade(u); })
      // Unidade fora do espelho (cidade que saiu da faxina, por exemplo): a
      // tela segue mostrando o local em texto, sem o link.
      .catch(() => { if (ativo) setUnidade(null); });
    return () => { ativo = false; };
  }, [consulta?.unidadeCnes]);

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
  const anotada = consulta.origem === 'paciente';
  const agendada = consulta.status === 'agendada';

  // Só a situação muda; o resto da consulta continua como está.
  const marcar = (status) => {
    setSalvando(true);
    definirSituacao(consulta.id, status)
      .then(recarregar)
      .catch((err) => setErroAcao(err.response?.data?.erro || 'Não foi possível mudar a situação.'))
      .finally(() => setSalvando(false));
  };

  const apagar = () => {
    // Apagar o que ele mesmo anotou não pede confirmação em janela: a
    // consulta volta a ser digitada em quatro campos, e a trilha de auditoria
    // guarda que a exclusão aconteceu.
    excluirConsulta(consulta.id)
      .then(() => navigate('/appointment'))
      .catch(() => setErroAcao('Não foi possível apagar esta anotação.'));
  };

  return (
    <div className="screen-container tela-rolagem">
      <div className="tela-topo">
        <button onClick={() => navigate('/appointment')} className="back-btn">
          <ChevronLeft size={20} /> Voltar
        </button>

        <div className="section-header">
          <h2 className="header-title">Detalhes da Consulta</h2>
          <BotaoPrivacidade rotulo="consulta" />
        </div>
      </div>

      <div className="tela-lista">

      {/* Motivo, resumo e conduta são o registro clínico do atendimento — é o
          conteúdo mais sensível da tela e o primeiro a sumir com o olhinho.
          Data e hora ficam: dizem quando, não o quê. */}
      <div className="card mb-6">
        <div className="detail-card-header">
          <div className="icon-box icon-box-lg" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <User size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 className={`font-bold text-lg ${oculto ? 'valor-oculto' : ''}`}>
              {oculto ? mascararTexto(consulta.medico) : consulta.medico}
            </h3>
            <p className={`text-sm font-bold text-primary ${oculto ? 'valor-oculto' : ''}`}>
              {oculto ? mascararTexto(consulta.especialidade) : consulta.especialidade}
            </p>
          </div>
          <StatusBadge status={consulta.status} />
        </div>

        <InfoField icon={Calendar} label="Data e hora">
          {formatarData(consulta.data)} • {consulta.hora}
        </InfoField>
        <InfoField icon={MapPin} label="Local">
          {oculto ? mascararTexto(consulta.local) : consulta.local}
          {/* Consulta marcada numa unidade da rede: a rota sai da coordenada
              do CNES, que erra menos que o endereço em texto livre. Só aparece
              quando existe o vínculo — consulta em consultório particular não
              tem unidade espelhada aqui. */}
          {unidade && !oculto && (
            <a
              className="consulta-como-chegar"
              href={`https://www.google.com/maps/dir/?api=1&destination=${unidade.latitude},${unidade.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Navigation size={13} /> Como chegar — {unidade.nome}
            </a>
          )}
        </InfoField>
        <InfoField icon={Info} label="Motivo">
          {oculto ? mascararTexto(consulta.motivo) : consulta.motivo}
        </InfoField>
      </div>

      {realizada && (consulta.resumo || consulta.conduta) && (
        <>
          <h3 className="section-title">Registro do atendimento</h3>
          <div className="card mb-6">
            {consulta.resumo && (
              <InfoField icon={FileText} label="Resumo">
                {oculto ? mascararTexto(consulta.resumo) : consulta.resumo}
              </InfoField>
            )}
            {consulta.conduta && (
              <InfoField icon={Clock} label="Conduta">
                {oculto ? mascararTexto(consulta.conduta) : consulta.conduta}
              </InfoField>
            )}
          </div>
        </>
      )}

      {erroAcao && <p className="form-erro">{erroAcao}</p>}

      {/* A situação de quem esteve lá. Nada no app sabe o que aconteceu no
          dia: sem estes botões a consulta ficava "agendada" para sempre, mesmo
          depois de acontecer ou de ser desmarcada com a unidade. Aparecem nas
          duas origens — desmarcar é coisa que o paciente faz na vida real —,
          mas não escrevem resumo nem conduta, que são do profissional. */}
      {agendada && (
        <>
          <h3 className="section-title">Você foi a esta consulta?</h3>
          <div className="card mb-6">
            <div className="form-botoes" style={{ marginTop: 0 }}>
              <button
                className="btn-primary"
                onClick={() => marcar('realizada')}
                disabled={salvando}
              >
                <CheckCircle2 size={18} /> Sim, fui
              </button>
              <button
                className="btn-secondary"
                onClick={() => marcar('cancelada')}
                disabled={salvando}
              >
                <XCircle size={18} /> Foi cancelada
              </button>
            </div>
          </div>
        </>
      )}

      <div className="flex-col gap-4">
        {realizada && (
          <button onClick={() => navigate('/exams')} className="btn-secondary">
            <Droplet size={18} /> Ver exames
          </button>
        )}

        {/* O que o paciente anotou, ele corrige e apaga. O atendimento
            registrado pelo profissional é prontuário: nem a tela nem a rota
            deixam mexer — o botão daqui é o de anotar o retorno. */}
        {anotada ? (
          <>
            <button className="btn-primary" onClick={() => setEditando(true)}>
              <Pencil size={18} /> Corrigir data ou local
            </button>
            <button className="btn-secondary" onClick={apagar}>
              <Trash2 size={18} /> Apagar anotação
            </button>
          </>
        ) : (
          // Marcar retorno: abre o formulário com profissional, especialidade e
          // local já preenchidos. Retorno é quase sempre com quem atendeu, no
          // mesmo lugar — só a data muda.
          <button className="btn-secondary" onClick={() => setAnotandoRetorno(true)}>
            <CalendarPlus size={18} /> Anotar retorno com este profissional
          </button>
        )}
      </div>
      </div>

      <Modal open={editando} title="Corrigir consulta" onClose={() => setEditando(false)}>
        <FormularioConsulta
          consulta={consulta}
          onPronto={() => { setEditando(false); recarregar(); }}
          onCancelar={() => setEditando(false)}
        />
      </Modal>

      <Modal open={anotandoRetorno} title="Anotar retorno" onClose={() => setAnotandoRetorno(false)}>
        <FormularioConsulta
          // Sem o id: é uma consulta nova com os campos herdados, não a edição
          // do atendimento que já aconteceu.
          consulta={{ ...consulta, id: null, data: '', hora: '' }}
          dependenteId={consulta.dependenteId}
          onPronto={() => { setAnotandoRetorno(false); navigate('/appointment'); }}
          onCancelar={() => setAnotandoRetorno(false)}
        />
      </Modal>
    </div>
  );
}
