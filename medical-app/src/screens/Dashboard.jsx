import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar, Syringe, FlaskConical, Activity, Bell, Stethoscope, FileText, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePrivacidade } from '../context/PrivacidadeContext';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import { mascararTexto } from '../utils/privacidade';
import { ICONES } from '../utils/icones';
import { MODO_DEMO } from '../demo/modo';
import api from '../services/api';
import { buscarAvisos } from '../services/avisos';
import { listarNotificacoes, marcarTodasLidas } from '../services/notificacoes';
import { marcasDosItens, lerVistos, gravarVistos } from '../utils/avisosVistos';

// Cada tipo de aviso tem seu ícone; "exame" é o padrão para o que não casar.
const ICONES_AVISO = {
  consulta: Calendar,
  campanha: Syringe,
  resultado: Activity,
  exame: FlaskConical,
  vacina: Syringe,
};

// Atalhos do Início: só os destinos mais usados, em grade compacta. O índice
// completo dos registros fica em "Minha Saúde" (/patient), em forma de lista.
const ATALHOS = [
  { rota: '/appointment', icone: ICONES.consultas, label: 'Consultas' },
  { rota: '/exams', icone: ICONES.exames, label: 'Exames' },
  { rota: '/vacinas', icone: ICONES.vacinas, label: 'Vacinas' },
  { rota: '/acesso-medico', icone: ICONES.acessoMedico, label: 'Acesso do médico' },
];

function AvisoItem({ aviso }) {
  const { oculto } = usePrivacidade();
  const Icone = ICONES_AVISO[aviso.tipo] || FlaskConical;

  // Campanha de vacinação é informação pública, igual para todo mundo — não há
  // o que esconder. Os outros avisos falam de exame, consulta e resultado do
  // paciente, então seguem o olhinho.
  const escondido = oculto && aviso.tipo !== 'campanha';

  return (
    <div className={`aviso-item ${aviso.severidade}`}>
      <div className="aviso-icone"><Icone size={18} /></div>
      <div className="aviso-texto">
        {/* De quem é o aviso. O Dashboard passou a olhar também os dependentes,
            e sem o nome "3 doses em atraso" não diz de quem. O titular não
            ganha etiqueta: o padrão continua sendo ele. */}
        {aviso.pessoa && <span className="aviso-pessoa">{aviso.pessoa}</span>}
        <p className={`aviso-titulo ${escondido ? 'valor-oculto' : ''}`}>
          {escondido ? mascararTexto(aviso.titulo) : aviso.titulo}
        </p>
        {aviso.detalhe && (
          <p className={`aviso-detalhe ${escondido ? 'valor-oculto' : ''}`}>
            {escondido ? mascararTexto(aviso.detalhe) : aviso.detalhe}
          </p>
        )}
      </div>
    </div>
  );
}

// Ícone de cada tipo de notificação.
const ICONES_NOTIFICACAO = {
  consulta: Stethoscope,
  exame: FlaskConical,
  prontuario: FileText,
  acesso: Bell,
  vacina: Syringe,
};

/**
 * Notificações: o que aconteceu na conta enquanto o paciente não estava olhando.
 *
 * Aparecem DENTRO do card "Avisos", mas continuam sendo coisas diferentes.
 * Aviso é DERIVADO ("faz um ano do seu último exame") e some sozinho quando
 * deixa de ser verdade; notificação é um FATO ("Dr. Fulano registrou uma
 * consulta") e só sai da lista quando o paciente marca como lida. Por isso ela
 * vem primeiro, com a etiqueta "Novo", e o "Marcar como lidas" só aparece
 * quando há alguma: assim continua claro o que some sozinho e o que não.
 */
function useNotificacoes() {
  const [lista, setLista] = useState([]);

  useEffect(() => {
    let ativo = true;
    listarNotificacoes()
      .then(({ notificacoes }) => {
        if (ativo) setLista(notificacoes.filter((n) => !n.lida));
      })
      .catch(() => {
        // Notificação é conveniência: se a busca falhar, o card mostra só os
        // avisos e o resto do Dashboard segue normal.
        if (ativo) setLista([]);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const limpar = async () => {
    setLista([]);
    try {
      await marcarTodasLidas();
    } catch {
      // Silêncio proposital: a tela já foi limpa, e insistir num erro de rede
      // aqui atrapalharia mais do que ajudaria.
    }
  };

  return { novidades: lista, limpar };
}

function NovidadeItem({ notificacao, oculto }) {
  const Icone = ICONES_NOTIFICACAO[notificacao.tipo] || Bell;
  return (
    <div className="aviso-item novidade">
      <div className="aviso-icone"><Icone size={18} /></div>
      <div className="aviso-texto">
        <span className="aviso-pessoa">Novo</span>
        {/* A mensagem traz o nome do profissional e o que ele fez — sem
            diagnóstico nem resultado —, mas ainda assim segue o olhinho. */}
        <p className={`aviso-titulo ${oculto ? 'valor-oculto' : ''}`}>
          {oculto ? mascararTexto(notificacao.mensagem) : notificacao.mensagem}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { paciente } = useAuth();
  const { oculto } = usePrivacidade();
  const [totalDependentes, setTotalDependentes] = useState(null);
  const [avisos, setAvisos] = useState(null);
  const { novidades, limpar } = useNotificacoes();
  // O card começa recolhido a cada visita (de propósito não é gravado): o
  // Início fica limpo, e a bolinha vermelha diz quando vale a pena abrir.
  const [avisosAbertos, setAvisosAbertos] = useState(false);
  const [vistos, setVistos] = useState(lerVistos);

  const marcas = useMemo(
    () => (avisos === null ? [] : marcasDosItens(avisos, novidades)),
    [avisos, novidades],
  );
  const temNaoVisto = marcas.some((m) => !vistos.has(m));
  const totalAvisos = avisos === null ? 0 : avisos.length + novidades.length;

  // Abrir o card é ver os avisos: o que estava na tela passa a contar como
  // visto, e a bolinha só volta quando surgir um aviso novo.
  useEffect(() => {
    if (avisosAbertos && temNaoVisto) setVistos((atual) => gravarVistos(atual, marcas));
  }, [avisosAbertos, temNaoVisto, marcas]);

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

  // Avisos calculados pela API a partir dos exames, consultas e campanhas.
  useEffect(() => {
    let ativo = true;
    buscarAvisos()
      .then((lista) => {
        if (ativo) setAvisos(lista);
      })
      .catch(() => {
        if (ativo) setAvisos([]);
      });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="screen-container tela-rolagem">
      {/* A saudação fica parada; atalhos, avisos e dependentes rolam. */}
      <div className="tela-topo">
        <header className="mb-6 section-header">
          <div>
            <h1 className="header-title">Olá, {primeiroNome}!</h1>
            <p className="header-subtitle">Resumo de hoje</p>
          </div>
          {/* No cabeçalho parado, e não no meio dos atalhos: numa emergência
              ninguém deveria precisar rolar a tela para achá-la. */}
          <button
            type="button"
            className="botao-emergencia"
            onClick={() => navigate('/emergencia')}
            aria-label="Abrir ficha de emergência"
          >
            <ICONES.emergencia size={18} /> Emergência
          </button>
        </header>
      </div>

      <div className="tela-lista">
      {/* Ações rápidas primeiro: são o que se usa todo dia. */}
      <h3 className="section-title">Ações Rápidas</h3>
      <div className="quick-actions-grid">
        {ATALHOS.map((atalho) => (
          <button
            key={atalho.rota}
            onClick={() => navigate(atalho.rota)}
            className="action-btn"
          >
            <div className="icon-box icon-box-gray">
              <atalho.icone size={24} />
            </div>
            <span className="font-bold text-sm">{atalho.label}</span>
          </button>
        ))}
      </div>

      <div className="section-header">
        <h3 className="section-title text-red">
          Avisos
          {temNaoVisto && !avisosAbertos && (
            <span className="avisos-ponto" role="status" aria-label="Há avisos que você ainda não viu" />
          )}
        </h3>
        <div className="avisos-acoes">
          {avisosAbertos && novidades.length > 0 && (
            <button type="button" className="notificacao-limpar" onClick={limpar}>
              Marcar como lidas
            </button>
          )}
          <BotaoPrivacidade rotulo="avisos" />
        </div>
      </div>
      {!avisosAbertos ? (
        <button
          type="button"
          className="card avisos-recolhido"
          onClick={() => setAvisosAbertos(true)}
          aria-expanded="false"
        >
          <span>
            {avisos === null
              ? 'Carregando avisos...'
              : totalAvisos === 0
                ? 'Não há avisos no momento.'
                : `${totalAvisos} ${totalAvisos === 1 ? 'aviso' : 'avisos'}. Clique aqui para ver.`}
          </span>
          {totalAvisos > 0 && <ChevronDown size={18} />}
        </button>
      ) : (
      <div className="card">
        {avisos === null ? (
          <p className="text-sm text-muted">Carregando avisos...</p>
        ) : avisos.length === 0 && novidades.length === 0 ? (
          <p className="text-sm text-muted">Não há avisos no momento.</p>
        ) : (
          <>
            {novidades.map((n) => (
              <NovidadeItem key={`novidade-${n.id}`} notificacao={n} oculto={oculto} />
            ))}
            {avisos.map((aviso, i) => (
              <AvisoItem key={`${aviso.tipo}-${i}`} aviso={aviso} />
            ))}
          </>
        )}
        <button
          type="button"
          className="avisos-recolher"
          onClick={() => setAvisosAbertos(false)}
          aria-expanded="true"
        >
          Recolher <ChevronUp size={16} />
        </button>
      </div>
      )}

      {/* Depois das ações rápidas: o número de dependentes não muda de um dia
          para o outro e não merecia o primeiro lugar da tela, acima dos avisos. */}
      <div
        className="card patient-summary"
        onClick={() => navigate('/dependentes')}
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
          <ICONES.dependentes size={24} />
        </div>
      </div>

      {/* Só na demonstração da feira: quem chega pelo QR Code dificilmente abre
          o menu "Mais", então o convite para avaliar fica no fim do Início. */}
      {MODO_DEMO && (
        <button type="button" className="avaliacao-convite" onClick={() => navigate('/avaliar')}>
          <ICONES.avaliacao size={22} />
          <span>
            <strong>Avaliar o projeto</strong>
            <small>Dê sua nota e deixe um feedback</small>
          </span>
        </button>
      )}
      </div>
    </div>
  );
}
