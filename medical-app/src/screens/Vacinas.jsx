import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Check, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePessoas } from '../context/PessoasContext';
import { usePrivacidade } from '../context/PrivacidadeContext';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import SeletorPessoa from '../components/SeletorPessoa';
import BotaoExplicacao from '../components/BotaoExplicacao';
import { mascarar } from '../utils/privacidade';
import { buscarCarteira } from '../services/vacinas';

// Calcula a idade (anos completos) a partir de uma data ISO (YYYY-MM-DD).
function calcularIdade(dataIso) {
  if (!dataIso) return null;
  const nasc = new Date(dataIso);
  if (Number.isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

// "2026-04-12" -> "12/04/2026". Sem new Date() de propósito: a data vem do
// banco sem fuso, e o construtor a interpretaria como UTC, o que muda o dia.
function formatarDataIso(iso) {
  if (!iso || iso.length < 10) return iso || '';
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

const ICONE = {
  aplicada: <Check size={16} />,
  atrasada: <AlertTriangle size={16} />,
  prevista: <Clock size={16} />,
};

function VacinaItem({ v, oculto }) {
  // O olhinho esconde as DATAS, não a lista de vacinas: os nomes e os períodos
  // saem do calendário do PNI, que é público e igual para todo mundo da mesma
  // idade. A data em que a pessoa tomou (ou deveria ter tomado) é que é dela.
  let quando;
  if (v.status === 'aplicada') {
    quando = v.aplicadaEm ? `Aplicada em ${formatarDataIso(v.aplicadaEm)}` : 'Aplicada';
  } else if (v.status === 'atrasada') {
    quando = v.prevista ? `Era para ter sido tomada em ${formatarDataIso(v.prevista)}` : 'Em atraso';
  } else {
    quando = v.prevista ? `Prevista para ${formatarDataIso(v.prevista)}` : v.periodo;
  }

  return (
    <div className={`vacina-item ${v.status}`}>
      <div className={`vacina-status-icon ${v.status}`}>{ICONE[v.status]}</div>
      <div className="vacina-info">
        <div className="vacina-top">
          <span className="vacina-nome">
            {v.vacina}
            {/* Nome da vacina é dado público do PNI — só ele sai do app. */}
            <BotaoExplicacao tipo="vacina" termo={v.vacina} />
          </span>
          <span className="vacina-periodo">{v.periodo}</span>
        </div>
        <span className="vacina-dose">{v.dose}</span>
        {v.protege && <span className="vacina-protege">Protege contra: {v.protege}</span>}
        <span className={`vacina-data ${oculto ? 'valor-oculto' : ''}`}>
          {oculto ? mascarar(quando) : quando}
        </span>
      </div>
    </div>
  );
}

export default function Vacinas() {
  const navigate = useNavigate();
  const { pessoa, dependenteId } = usePessoas();
  const { oculto } = usePrivacidade();

  const [doses, setDoses] = useState([]);
  const [resumo, setResumo] = useState({ total: 0, aplicadas: 0, atrasadas: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    return buscarCarteira(dependenteId)
      .then(({ doses: lista, resumo: r }) => {
        setDoses(lista);
        setResumo(r);
        setErro(null);
      })
      .catch(() => setErro('Não foi possível carregar a carteira de vacinação.'))
      .finally(() => setCarregando(false));
  }, [dependenteId]);

  useEffect(() => { carregar(); }, [carregar]);

  const idade = calcularIdade(pessoa.data_nascimento);
  const rotuloIdade = idade != null ? `${idade} ${idade === 1 ? 'ano' : 'anos'}` : 'Titular da conta';

  const atrasadas = doses.filter((v) => v.status === 'atrasada');
  const previstas = doses.filter((v) => v.status === 'prevista');
  const aplicadas = doses.filter((v) => v.status === 'aplicada');
  const percentual = resumo.total ? Math.round((resumo.aplicadas / resumo.total) * 100) : 0;

  return (
    <div className="screen-container tela-rolagem">
      {/* Cabeçalho fixo: só a lista de doses rola. */}
      <div className="tela-topo">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ChevronLeft size={20} /> Voltar
        </button>

        <div className="section-header">
          <div>
            <h2 className="header-title mb-2">Carteira de Vacinação</h2>
            <p className="text-sm text-muted">Calendário Nacional de Vacinação (SUS)</p>
          </div>
          <BotaoPrivacidade rotulo="datas" />
        </div>

        {/* Seletor de pessoa (titular + dependentes) */}
        <SeletorPessoa />

        {/* Resumo / progresso */}
        <div className="card">
          <div className="vacina-resumo">
            <div className="icon-box"><ShieldCheck size={26} /></div>
            <div style={{ flex: 1 }}>
              <div className="flex justify-between items-center mb-2">
                <span className={`font-bold ${oculto ? 'valor-oculto' : ''}`}>
                  {oculto ? mascarar(rotuloIdade) : rotuloIdade}
                </span>
                <span className="text-sm text-muted">
                  {resumo.aplicadas} de {resumo.total} registradas
                </span>
              </div>
              <div className="vacina-progress-bg">
                <div className="vacina-progress-fill" style={{ width: `${percentual}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* A carteira aqui é só de leitura: quem confirma a dose é o
            profissional, pelo código de acesso. Sem essa linha o paciente
            procuraria um botão que não existe. */}
        <p className="text-xs text-muted">
          O registro das doses é feito pelo profissional de saúde, com o código
          de acesso que você gera em Mais › Acesso do médico.
        </p>

        {erro && <p className="text-sm text-red">{erro}</p>}
      </div>

      {/* Única área rolável da tela */}
      <div className="tela-lista">
        {carregando && <p className="text-sm text-muted">Carregando a carteira…</p>}

        {!carregando && atrasadas.length > 0 && (
          <>
            <h3 className="section-title">Em atraso</h3>
            {atrasadas.map((v) => (
              <VacinaItem key={v.id} v={v} oculto={oculto} />
            ))}
          </>
        )}

        {!carregando && previstas.length > 0 && (
          <>
            <h3 className="section-title" style={{ marginTop: atrasadas.length ? '24px' : '0' }}>
              Próximas doses
            </h3>
            {previstas.map((v) => (
              <VacinaItem key={v.id} v={v} oculto={oculto} />
            ))}
          </>
        )}

        {!carregando && aplicadas.length > 0 && (
          <>
            <h3 className="section-title" style={{ marginTop: doses.length > aplicadas.length ? '24px' : '0' }}>
              Doses registradas
            </h3>
            {aplicadas.map((v) => (
              <VacinaItem key={v.id} v={v} oculto={oculto} />
            ))}
          </>
        )}

        {!carregando && doses.length === 0 && !erro && (
          <p className="text-sm text-muted">Nenhuma dose no calendário para esta idade.</p>
        )}
      </div>
    </div>
  );
}
