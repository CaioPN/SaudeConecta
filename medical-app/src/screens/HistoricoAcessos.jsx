import React, { useEffect, useState } from 'react';
import { ChevronLeft, KeyRound, BookOpen, Calendar, Activity, Ban, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePrivacidade } from '../context/PrivacidadeContext';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import { mascararTexto } from '../utils/privacidade';
import { listarHistoricoAcessos } from '../services/acessos';

// Como cada ação gravada no banco é mostrada ao paciente. A chave é o valor
// da coluna `acao` de acessos_log, escrita pelo ApiServer.
const ACOES = {
  entrou: { texto: 'Entrou com o seu código', icone: KeyRound, cor: 'consulta' },
  leu_prontuario: { texto: 'Consultou o seu resumo clínico', icone: BookOpen, cor: 'consulta' },
  registrou_consulta: { texto: 'Registrou uma consulta', icone: Calendar, cor: 'consulta' },
  registrou_exame: { texto: 'Registrou um exame', icone: Activity, cor: 'exame' },
  revogado: { texto: 'Você revogou o acesso', icone: Ban, cor: 'revogado' },
};

const PADRAO = { texto: 'Ação registrada', icone: ShieldCheck, cor: 'consulta' };

// "12/03/2026 às 14:30"
function dataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} às ${hora}`;
}

export default function HistoricoAcessos() {
  const navigate = useNavigate();
  const { oculto } = usePrivacidade();
  const [registros, setRegistros] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;
    listarHistoricoAcessos()
      .then((lista) => {
        if (ativo) setRegistros(lista);
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar o histórico de acessos.');
      });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <div className="section-header">
        <div>
          <h2 className="header-title">Histórico de acessos</h2>
          <p className="header-subtitle">Quem abriu os seus dados, e quando</p>
        </div>
        <BotaoPrivacidade rotulo="histórico" />
      </div>

      <p className="acesso-nota mb-6">
        <ShieldCheck size={14} /> Cada vez que um profissional usa um código
        gerado por você, a ação fica registrada aqui. O registro é automático e
        não pode ser apagado pelo médico nem por você.
      </p>

      {erro && <p className="empty-state">{erro}</p>}
      {!erro && registros === null && <p className="empty-state">Carregando histórico…</p>}
      {!erro && registros?.length === 0 && (
        <p className="empty-state">
          Nenhum acesso foi usado até agora. Quando você gerar um código em
          "Acesso do médico" e o profissional entrar, tudo o que ele fizer
          aparece aqui.
        </p>
      )}

      {!erro && registros?.length > 0 && (
        <div className="timeline-container">
          {registros.map((r) => {
            const info = ACOES[r.acao] || PADRAO;
            const Icone = info.icone;
            return (
              <div key={r.id} className="timeline-item">
                <div className={`timeline-dot ${info.cor}`}>
                  <Icone size={10} />
                </div>

                <div className="timeline-head">
                  <h4 className="font-bold">{info.texto}</h4>
                </div>
                <p className="text-xs text-muted">{dataHora(r.criadoEm)}</p>

                <div className="acesso-log-quem">
                  <p className="font-bold text-sm">{r.medico || 'Você'}</p>
                  <p className="text-xs text-muted">
                    {[r.crm && `CRM ${r.crm}`, r.especialidade].filter(Boolean).join(' · ')}
                    {r.crm || r.especialidade ? ' · ' : ''}
                    {r.escopo === 'escrita' ? 'Leitura e registro' : 'Somente leitura'}
                  </p>
                  {r.detalhe && (
                    <p className={`text-xs text-muted ${oculto ? 'valor-oculto' : ''}`}>
                      {oculto ? mascararTexto(r.detalhe) : r.detalhe}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
