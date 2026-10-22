import React, { useCallback, useEffect, useState } from 'react';
import useVoltar from '../hooks/useVoltar';
import { ChevronLeft, Check, Clock, AlertTriangle, ShieldCheck, Download, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePessoas } from '../context/PessoasContext';
import { usePrivacidade } from '../context/PrivacidadeContext';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import SeletorPessoa from '../components/SeletorPessoa';
import EstadoErro from '../components/EstadoErro';
import BotaoExplicacao from '../components/BotaoExplicacao';
import { mascarar } from '../utils/privacidade';
import { buscarCarteira, registrarExportacaoCarteira } from '../services/vacinas';
import { senhaDoPaciente } from '../utils/pdf';
import { textoDaData, gerarPdfCarteira } from '../utils/pdfCarteira';

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

const ICONE = {
  aplicada: <Check size={16} />,
  atrasada: <AlertTriangle size={16} />,
  prevista: <Clock size={16} />,
};

function VacinaItem({ v, oculto }) {
  // O olhinho esconde as DATAS, não a lista de vacinas: os nomes e os períodos
  // saem do calendário do PNI, que é público e igual para todo mundo da mesma
  // idade. A data em que a pessoa tomou (ou deveria ter tomado) é que é dela.
  const quando = textoDaData(v);

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
  const voltar = useVoltar('/patient');
  const { paciente } = useAuth();
  const { pessoa, dependenteId } = usePessoas();
  const { oculto } = usePrivacidade();

  const [doses, setDoses] = useState([]);
  const [resumo, setResumo] = useState({ total: 0, aplicadas: 0, atrasadas: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    // Limpa antes de buscar: se a busca de outra pessoa falhar, as doses de
    // quem estava selecionado antes não podem continuar na tela.
    setDoses([]);
    setResumo({ total: 0, aplicadas: 0, atrasadas: 0 });
    return buscarCarteira(dependenteId)
      .then(({ doses: lista, resumo: r }) => {
        setDoses(lista);
        setResumo(r);
        setErro(null);
      })
      .catch(setErro)
      .finally(() => setCarregando(false));
  }, [dependenteId]);

  useEffect(() => { carregar(); }, [carregar]);

  const idade = calcularIdade(pessoa.data_nascimento);
  const rotuloIdade = idade != null ? `${idade} ${idade === 1 ? 'ano' : 'anos'}` : 'Titular da conta';

  const atrasadas = doses.filter((v) => v.status === 'atrasada');
  const previstas = doses.filter((v) => v.status === 'prevista');
  const aplicadas = doses.filter((v) => v.status === 'aplicada');
  const percentual = resumo.total ? Math.round((resumo.aplicadas / resumo.total) * 100) : 0;
  const senha = senhaDoPaciente(paciente);
  // Só com a carteira carregada de verdade: na falha, um PDF vazio seria um
  // documento afirmando que a pessoa não tem dose nenhuma.
  const podeBaixar = !carregando && !erro && doses.length > 0;

  const baixarPdf = () => {
    const nome = pessoa.nome || paciente?.nome || 'Paciente';
    gerarPdfCarteira({ senha, nome, rotuloIdade, atrasadas, previstas, aplicadas });
    registrarExportacaoCarteira({
      aplicadas: aplicadas.length,
      atrasadas: atrasadas.length,
      protegido: senha !== null,
      dependenteId,
    });
  };

  return (
    <div className="screen-container tela-rolagem">
      {/* Cabeçalho fixo: só a lista de doses rola. */}
      <div className="tela-topo">
        <button onClick={() => voltar()} className="back-btn">
          <ChevronLeft size={20} /> Voltar
        </button>

        <div className="section-header">
          <h2 className="header-title">Carteira de Vacinação</h2>
          <div className="flex items-center gap-4">
            <BotaoPrivacidade rotulo="datas" />
            {podeBaixar && (
              <button onClick={baixarPdf} className="pdf-download-btn">
                <Download size={18} />
                <span>Baixar PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* Seletor de pessoa (titular + dependentes) */}
        <SeletorPessoa />

        {/* Resumo / progresso, numa faixa baixa: é a única coisa do topo que
            se consulta enquanto a lista rola. Some na falha: "0 de 0
            registradas" seria uma afirmação sobre a carteira que o app não
            conseguiu ler. */}
        {!erro && (
        <div className="card vacina-resumo-card">
          <div className="vacina-resumo">
            <div className="icon-box icon-box-sm"><ShieldCheck size={20} /></div>
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
        )}

      </div>

      {/* Única área rolável da tela. As notas abrem a lista, e não o topo
          fixo: lidas uma vez, saem de cena ao rolar e deixam o espaço para
          as doses. */}
      <div className="tela-lista">
        <div className="vacina-notas">
          {/* A carteira aqui é só de leitura: quem confirma a dose é o
              profissional, pelo código de acesso. Sem essa linha o paciente
              procuraria um botão que não existe. */}
          <p className="text-xs text-muted">
            Calendário Nacional de Vacinação (SUS). O registro das doses é feito
            pelo profissional de saúde, com o código de acesso que você gera em
            Mais › Acesso do médico.
          </p>
          {podeBaixar && (
            <p className="pdf-nota">
              <Lock size={13} />
              {senha
                ? 'O PDF baixado abre com senha: os 4 primeiros dígitos do seu CPF.'
                : 'Sem CPF no cadastro, o PDF é baixado sem senha de proteção.'}
            </p>
          )}
        </div>

        {carregando && <p className="text-sm text-muted">Carregando a carteira…</p>}
        {erro && !carregando && (
          <EstadoErro erro={erro} oQue="a carteira de vacinação" onTentarDeNovo={carregar} />
        )}

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
