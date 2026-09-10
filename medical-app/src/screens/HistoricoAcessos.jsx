import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, Ban, ShieldCheck, ShieldAlert, LogIn, Download, Stethoscope, User,
  Pill, KeyRound, HeartHandshake,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePrivacidade } from '../context/PrivacidadeContext';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import { mascararTexto } from '../utils/privacidade';
import { ICONES } from '../utils/icones';
import { listarAuditoria } from '../services/auditoria';

// Como cada ação gravada no banco é mostrada ao paciente. A chave é o valor da
// coluna `acao` — de acessos_log, quando quem agiu foi o médico, e de
// auditoria, quando foi o próprio paciente.
//
// Os ícones vêm de utils/icones.js sempre que a ação tem um assunto no mapa
// (prontuário, exames, dependentes, acesso do médico); os que sobram são
// eventos sem assunto próprio, como entrar na conta ou baixar um arquivo.
const ACOES = {
  // Lado do médico (acessos_log)
  entrou: { texto: 'Entrou com o seu código', icone: ICONES.acessoMedico, cor: 'consulta' },
  leu_prontuario: { texto: 'Consultou o seu resumo clínico', icone: ICONES.prontuario, cor: 'consulta' },
  registrou_consulta: { texto: 'Registrou uma consulta', icone: ICONES.consultas, cor: 'consulta' },
  registrou_exame: { texto: 'Registrou um exame', icone: ICONES.exames, cor: 'exame' },
  registrou_alergia: { texto: 'Registrou uma alergia', icone: ShieldAlert, cor: 'consulta' },
  removeu_alergia: { texto: 'Removeu uma alergia do prontuário', icone: ShieldAlert, cor: 'revogado' },
  registrou_condicao: { texto: 'Registrou uma condição', icone: ICONES.prontuario, cor: 'consulta' },
  removeu_condicao: { texto: 'Removeu uma condição do prontuário', icone: ICONES.prontuario, cor: 'revogado' },
  registrou_medicacao: { texto: 'Registrou uma medicação', icone: Pill, cor: 'consulta' },
  removeu_medicacao: { texto: 'Removeu uma medicação do prontuário', icone: Pill, cor: 'revogado' },
  revogado: { texto: 'Você revogou o acesso', icone: Ban, cor: 'revogado' },

  // Lado do paciente (auditoria)
  login: { texto: 'Você entrou na sua conta', icone: LogIn, cor: 'consulta' },
  login_falhou: { texto: 'Tentativa de entrada sem sucesso', icone: ShieldAlert, cor: 'revogado' },
  solicitou_senha: { texto: 'Pedido de recuperação de senha', icone: KeyRound, cor: 'revogado' },
  redefiniu_senha: { texto: 'A senha da conta foi trocada', icone: KeyRound, cor: 'revogado' },
  consultou_prontuario: { texto: 'Você abriu o prontuário', icone: ICONES.prontuario, cor: 'consulta' },
  consultou_exames: { texto: 'Você abriu os exames', icone: ICONES.exames, cor: 'exame' },
  consultou_consultas: { texto: 'Você abriu as consultas', icone: ICONES.consultas, cor: 'consulta' },
  exportou_exames: { texto: 'Você baixou o PDF de exames', icone: Download, cor: 'exame' },
  cadastrou_dependente: { texto: 'Você cadastrou um dependente', icone: ICONES.dependentes, cor: 'consulta' },
  excluiu_dependente: { texto: 'Você excluiu um dependente', icone: ICONES.dependentes, cor: 'revogado' },
  cadastrou_contato: { texto: 'Você cadastrou um contato de emergência', icone: HeartHandshake, cor: 'consulta' },
  excluiu_contato: { texto: 'Você excluiu um contato de emergência', icone: HeartHandshake, cor: 'revogado' },
  gerou_codigo: { texto: 'Você gerou um código de acesso', icone: ICONES.acessoMedico, cor: 'consulta' },
  consultou_vacinas: { texto: 'Você abriu a carteira de vacinação', icone: ICONES.vacinas, cor: 'consulta' },
  registrou_vacina: { texto: 'Você registrou uma dose de vacina', icone: ICONES.vacinas, cor: 'consulta' },
  removeu_vacina: { texto: 'Você desfez o registro de uma dose', icone: ICONES.vacinas, cor: 'revogado' },
  atualizou_perfil: { texto: 'Você alterou dados do cadastro', icone: User, cor: 'consulta' },
  solicitou_senha: { texto: 'Você pediu a recuperação da senha', icone: ShieldCheck, cor: 'consulta' },
  redefiniu_senha: { texto: 'Você trocou a senha', icone: ShieldCheck, cor: 'revogado' },
  definiu_referencia: { texto: 'Você escolheu sua unidade de referência', icone: ShieldCheck, cor: 'consulta' },
};

const PADRAO = { texto: 'Ação registrada', icone: ShieldCheck, cor: 'consulta' };

const FILTROS = [
  { id: 'todos', rotulo: 'Tudo', icone: ShieldCheck },
  { id: 'medico', rotulo: 'Profissionais', icone: Stethoscope },
  { id: 'paciente', rotulo: 'Você', icone: User },
];

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
  const [filtro, setFiltro] = useState('todos');
  // Segundo filtro, por pessoa: quem cuida de dois dependentes quer poder
  // perguntar "o que andaram fazendo com os dados do meu filho".
  const [pessoa, setPessoa] = useState('todas');

  useEffect(() => {
    let ativo = true;
    listarAuditoria()
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

  // Pessoas que aparecem na trilha, para o segundo filtro. Sai dos próprios
  // registros, e não da lista de dependentes: um dependente já excluído
  // continua na trilha, e sumir com ele do filtro esconderia o que foi feito.
  const pessoas = useMemo(() => {
    if (!registros) return [];
    const nomes = new Set();
    registros.forEach((r) => { if (r.dependente) nomes.add(r.dependente); });
    return [...nomes].sort();
  }, [registros]);

  const visiveis = useMemo(() => {
    if (!registros) return [];
    return registros.filter((r) => {
      if (filtro !== 'todos' && r.origem !== filtro) return false;
      if (pessoa === 'todas') return true;
      if (pessoa === 'titular') return !r.dependente;
      return r.dependente === pessoa;
    });
  }, [registros, filtro, pessoa]);

  return (
    <div className="screen-container tela-rolagem">
      {/* Cabeçalho, explicação e os dois filtros ficam parados: eles comandam
          a trilha, e numa conta com muito registro sumiam da tela. */}
      <div className="tela-topo">
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
        <ShieldCheck size={14} /> Toda vez que um profissional usa um código
        gerado por você — e toda vez que você entra, abre um dado sensível ou
        exporta um arquivo — a ação fica registrada aqui. O registro é
        automático e não pode ser apagado pelo médico nem por você.
      </p>

      <div className="tabs-wrapper">
        {FILTROS.map((f) => {
          const Icone = f.icone;
          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`tab-btn ${filtro === f.id ? 'active' : ''}`}
            >
              <Icone size={18} />
              <span>{f.rotulo}</span>
            </button>
          );
        })}
      </div>

      {/* Filtro por pessoa. Só aparece quando há dependente na trilha: numa
          conta sem dependentes ele seria uma linha inteira para dizer "você". */}
      {pessoas.length > 0 && (
        <div className="trilha-pessoas">
          {['todas', 'titular', ...pessoas].map((id) => (
            <button
              key={id}
              type="button"
              className={`rede-filtro ${pessoa === id ? 'active' : ''}`}
              onClick={() => setPessoa(id)}
            >
              {id === 'todas' ? 'Todas as pessoas' : id === 'titular' ? 'Você' : id}
            </button>
          ))}
        </div>
      )}
      </div>

      <div className="tela-lista">
      {erro && <p className="empty-state">{erro}</p>}
      {!erro && registros === null && <p className="empty-state">Carregando histórico…</p>}
      {!erro && registros !== null && visiveis.length === 0 && (
        <p className="empty-state">
          {filtro === 'medico'
            ? 'Nenhum profissional usou um código seu até agora. Quando você gerar um em "Acesso do médico" e ele entrar, tudo o que fizer aparece aqui.'
            : 'Nada registrado neste filtro por enquanto.'}
        </p>
      )}

      {!erro && visiveis.length > 0 && (
        <div className="timeline-container">
          {visiveis.map((r) => {
            const info = ACOES[r.acao] || PADRAO;
            const Icone = info.icone;
            const doMedico = r.origem === 'medico';
            return (
              <div key={r.id} className="timeline-item">
                <div className={`timeline-dot ${info.cor}`}>
                  <Icone size={10} />
                </div>

                <div className="timeline-head">
                  <h4 className="font-bold">{info.texto}</h4>
                  {r.dependente && <span className="trilha-pessoa">{r.dependente}</span>}
                </div>
                <p className="text-xs text-muted">{dataHora(r.criadoEm)}</p>

                <div className="acesso-log-quem">
                  <p className="font-bold text-sm">{r.medico || 'Você'}</p>
                  {doMedico ? (
                    <p className="text-xs text-muted">
                      {[r.crm && `CRM ${r.crm}`, r.especialidade].filter(Boolean).join(' · ')}
                      {r.crm || r.especialidade ? ' · ' : ''}
                      {r.escopo === 'escrita' ? 'Leitura e registro' : 'Somente leitura'}
                    </p>
                  ) : (
                    r.ip && (
                      <p className={`text-xs text-muted ${oculto ? 'valor-oculto' : ''}`}>
                        Aparelho em {oculto ? mascararTexto(r.ip) : r.ip}
                      </p>
                    )
                  )}
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
    </div>
  );
}
