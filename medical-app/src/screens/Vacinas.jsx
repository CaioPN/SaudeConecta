import React, { useMemo } from 'react';
import { ChevronLeft, Check, Clock, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePessoas } from '../context/PessoasContext';
import { usePrivacidade } from '../context/PrivacidadeContext';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import SeletorPessoa from '../components/SeletorPessoa';
import { mascarar } from '../utils/privacidade';
import { montarCarteira } from '../data/vacinas';

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

function VacinaItem({ v, oculto }) {
  const tomada = v.status === 'tomada';

  // O olhinho esconde as DATAS, não a lista de vacinas: os nomes e os períodos
  // saem do calendário do PNI, que é público e igual para todo mundo da mesma
  // idade. A data em que a pessoa tomou (ou vai tomar) é que é dela.
  const quando = tomada
    ? v.dataPrevista ? `Aplicada em ${v.dataPrevista}` : 'Aplicada — em dia'
    : `Prevista para ${v.dataPrevista}`;

  return (
    <div className={`vacina-item ${v.status}`}>
      <div className={`vacina-status-icon ${v.status}`}>
        {tomada ? <Check size={16} /> : <Clock size={16} />}
      </div>
      <div className="vacina-info">
        <div className="vacina-top">
          <span className="vacina-nome">{v.vacina}</span>
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
  const { pessoa } = usePessoas();
  const { oculto } = usePrivacidade();

  const idade = calcularIdade(pessoa.data_nascimento);
  // O titular usa o calendário adulto; dependentes de até 12 anos usam o infantil.
  const adulto = pessoa.titular || (idade != null && idade >= 13);

  const carteira = useMemo(
    () => montarCarteira(pessoa.data_nascimento, { adulto }),
    [pessoa.data_nascimento, adulto],
  );

  const tomadas = carteira.filter((v) => v.status === 'tomada');
  const pendentes = carteira.filter((v) => v.status === 'pendente');
  const percentual = carteira.length ? Math.round((tomadas.length / carteira.length) * 100) : 0;

  const rotuloIdade = idade != null ? `${idade} ${idade === 1 ? 'ano' : 'anos'}` : 'Titular da conta';

  return (
    <div className="screen-container vacinas-screen">
      {/* Cabeçalho fixo: só a lista de doses rola. */}
      <div className="vacinas-topo">
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
                <span className="text-sm text-muted">{tomadas.length} de {carteira.length} em dia</span>
              </div>
              <div className="vacina-progress-bg">
                <div className="vacina-progress-fill" style={{ width: `${percentual}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Única área rolável da tela */}
      <div className="vacinas-lista">
        {/* Próximas doses (pendentes) */}
        {pendentes.length > 0 && (
          <>
            <h3 className="section-title">Próximas doses</h3>
            {pendentes.map((v, i) => (
              <VacinaItem key={`p-${v.vacina}-${v.dose}-${i}`} v={v} oculto={oculto} />
            ))}
          </>
        )}

        {/* Doses já aplicadas */}
        <h3 className="section-title" style={{ marginTop: pendentes.length ? '24px' : '0' }}>
          {adulto ? 'Vacinas em dia' : 'Doses já aplicadas'}
        </h3>
        {tomadas.map((v, i) => (
          <VacinaItem key={`t-${v.vacina}-${v.dose}-${i}`} v={v} oculto={oculto} />
        ))}
      </div>
    </div>
  );
}
