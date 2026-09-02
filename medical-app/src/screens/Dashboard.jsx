import React, { useEffect, useState } from 'react';
import { Calendar, Syringe, FlaskConical, Activity, Bell, Stethoscope, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePrivacidade } from '../context/PrivacidadeContext';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import { mascararTexto } from '../utils/privacidade';
import { ICONES } from '../utils/icones';
import api from '../services/api';
import { buscarAvisos } from '../services/avisos';
import { listarNotificacoes, marcarTodasLidas } from '../services/notificacoes';

// Cada tipo de aviso tem seu ícone; "exame" é o padrão para o que não casar.
const ICONES_AVISO = {
  consulta: Calendar,
  campanha: Syringe,
  resultado: Activity,
  exame: FlaskConical,
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
};

/**
 * Notificações: o que aconteceu na conta enquanto o paciente não estava olhando.
 *
 * Fica separado do card "Avisos" de propósito, porque as duas coisas respondem
 * a perguntas diferentes. Aviso é DERIVADO ("faz um ano do seu último exame") e
 * some sozinho quando deixa de ser verdade; notificação é um FATO que aconteceu
 * uma vez ("Dr. Fulano registrou uma consulta") e continua valendo mesmo depois
 * de lida. Misturar os dois num card só faria o paciente não saber o que some e
 * o que fica.
 *
 * O bloco não aparece quando não há nada não lido — quem abre o app todo dia
 * não precisa ver um card vazio.
 */
function Notificacoes({ oculto }) {
  const [lista, setLista] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    let ativo = true;
    listarNotificacoes()
      .then(({ notificacoes, naoLidas: total }) => {
        if (!ativo) return;
        setLista(notificacoes.filter((n) => !n.lida));
        setNaoLidas(total);
      })
      .catch(() => {
        // Notificação é conveniência: se a busca falhar, o bloco não aparece e
        // o resto do Dashboard segue normal.
        if (ativo) setLista([]);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const limpar = async () => {
    setLista([]);
    setNaoLidas(0);
    try {
      await marcarTodasLidas();
    } catch {
      // Silêncio proposital: a tela já foi limpa, e insistir num erro de rede
      // aqui atrapalharia mais do que ajudaria.
    }
  };

  if (naoLidas === 0 || lista.length === 0) return null;

  return (
    <>
      <div className="section-header">
        <h3 className="section-title">
          Novidades <span className="notificacao-contador">{naoLidas}</span>
        </h3>
        <button type="button" className="notificacao-limpar" onClick={limpar}>
          Marcar como lidas
        </button>
      </div>
      <div className="card">
        {lista.map((n) => {
          const Icone = ICONES_NOTIFICACAO[n.tipo] || Bell;
          return (
            <div key={n.id} className="notificacao-item">
              <div className="icon-box icon-box-gray"><Icone size={18} /></div>
              {/* A mensagem traz o nome do profissional e o que ele fez — sem
                  diagnóstico nem resultado —, mas ainda assim segue o olhinho. */}
              <p className={`text-sm ${oculto ? 'valor-oculto' : ''}`}>
                {oculto ? mascararTexto(n.mensagem) : n.mensagem}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { paciente } = useAuth();
  const { oculto } = usePrivacidade();
  const [totalDependentes, setTotalDependentes] = useState(null);
  const [avisos, setAvisos] = useState(null);

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
    <div className="screen-container">
      <header className="mb-6">
        <h1 className="header-title">Olá, {primeiroNome}!</h1>
        <p className="header-subtitle">Resumo de hoje</p>
      </header>

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

      <Notificacoes oculto={oculto} />

      <div className="section-header">
        <h3 className="section-title text-red">Avisos</h3>
        <BotaoPrivacidade rotulo="avisos" />
      </div>
      <div className="card">
        {avisos === null ? (
          <p className="text-sm text-muted">Carregando avisos...</p>
        ) : avisos.length === 0 ? (
          <p className="text-sm text-muted">Não há avisos no momento.</p>
        ) : (
          avisos.map((aviso, i) => (
            <AvisoItem key={`${aviso.tipo}-${i}`} aviso={aviso} />
          ))
        )}
      </div>

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
    </div>
  );
}
