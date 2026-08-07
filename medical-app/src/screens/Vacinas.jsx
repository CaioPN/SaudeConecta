import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Check, Clock, ShieldCheck, User, Baby } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
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

// Cor do ícone da pessoa: azul para meninos, rosa para meninas. Quando o
// gênero é "Outro"/"Prefiro não informar" (ou é o titular), fica neutro.
function classePorGenero(pessoa) {
  if (pessoa.titular) return '';
  const genero = (pessoa.genero || '').trim().toLowerCase();
  if (genero === 'masculino') return 'menino';
  if (genero === 'feminino') return 'menina';
  return '';
}

function VacinaItem({ v }) {
  const tomada = v.status === 'tomada';
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
        <span className="vacina-data">
          {tomada
            ? v.dataPrevista ? `Aplicada em ${v.dataPrevista}` : 'Aplicada — em dia'
            : `Prevista para ${v.dataPrevista}`}
        </span>
      </div>
    </div>
  );
}

export default function Vacinas() {
  const navigate = useNavigate();
  const { paciente } = useAuth();
  const [dependentes, setDependentes] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState('titular');

  useEffect(() => {
    api
      .get('/dependentes')
      .then(({ data }) => setDependentes(data.dependentes || []))
      .catch(() => setDependentes([]));
  }, []);

  // Lista de pessoas: o titular da conta + seus dependentes.
  const pessoas = useMemo(() => [
    {
      id: 'titular',
      nome: paciente?.nome || 'Você',
      data_nascimento: paciente?.data_nascimento,
      titular: true,
    },
    ...dependentes.map((d) => ({
      id: d.id,
      nome: d.nome,
      data_nascimento: d.data_nascimento,
      genero: d.genero,
      titular: false,
    })),
  ], [paciente, dependentes]);

  const pessoa = pessoas.find((p) => String(p.id) === String(selecionadoId)) || pessoas[0];
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

  return (
    <div className="screen-container vacinas-screen">
      {/* Cabeçalho fixo: só a lista de doses rola. */}
      <div className="vacinas-topo">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ChevronLeft size={20} /> Voltar
        </button>

        <h2 className="header-title mb-2">Carteira de Vacinação</h2>
        <p className="text-sm text-muted mb-6">Calendário Nacional de Vacinação (SUS)</p>

        {/* Seletor de pessoa (titular + dependentes) */}
        <div className="vacina-pessoa-selector">
          {pessoas.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelecionadoId(p.id)}
              className={`vacina-pessoa-pill ${String(p.id) === String(pessoa.id) ? 'active' : ''}`}
            >
              <span className={`vacina-pessoa-icone ${classePorGenero(p)}`}>
                {p.titular ? <User size={15} /> : <Baby size={15} />}
              </span>
              {p.titular ? `${p.nome.split(' ')[0]} (você)` : p.nome.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Resumo / progresso */}
        <div className="card">
          <div className="vacina-resumo">
            <div className="icon-box"><ShieldCheck size={26} /></div>
            <div style={{ flex: 1 }}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">
                  {idade != null ? `${idade} ${idade === 1 ? 'ano' : 'anos'}` : 'Titular da conta'}
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
              <VacinaItem key={`p-${v.vacina}-${v.dose}-${i}`} v={v} />
            ))}
          </>
        )}

        {/* Doses já aplicadas */}
        <h3 className="section-title" style={{ marginTop: pendentes.length ? '24px' : '0' }}>
          {adulto ? 'Vacinas em dia' : 'Doses já aplicadas'}
        </h3>
        {tomadas.map((v, i) => (
          <VacinaItem key={`t-${v.vacina}-${v.dose}-${i}`} v={v} />
        ))}
      </div>
    </div>
  );
}
