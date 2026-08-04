import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, KeyRound, ShieldCheck, Eye, PenLine, Ban, Clock, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { gerarAcesso, listarAcessos, revogarAcesso, situacaoAcesso } from '../services/acessos';

const ROTULO_SITUACAO = {
  'aguardando': 'Aguardando o médico',
  'em-uso': 'Em uso',
  'expirado': 'Expirado',
  'revogado': 'Revogado',
};

// A cor do selo reaproveita os status já existentes no StatusBadge.
const STATUS_BADGE = {
  'aguardando': 'agendada',
  'em-uso': 'normal',
  'expirado': 'pendente',
  'revogado': 'alterado',
};

/** Minutos e segundos restantes até `iso`; null quando já passou. */
function tempoRestante(iso, agora) {
  const ms = new Date(iso) - agora;
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function dataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AcessoMedico() {
  const navigate = useNavigate();
  const [acessos, setAcessos] = useState([]);
  const [novo, setNovo] = useState(null); // { codigo, expiraEm, escopo }
  const [escopo, setEscopo] = useState('escrita');
  const [agora, setAgora] = useState(new Date());
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const recarregar = useCallback(() => {
    return listarAcessos()
      .then(setAcessos)
      .catch(() => setErro('Não foi possível carregar seus acessos.'))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  // Mantém a contagem regressiva viva enquanto a tela estiver aberta.
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const gerar = async () => {
    setGerando(true);
    setErro(null);
    setCopiado(false);
    try {
      const dados = await gerarAcesso(escopo);
      const expiraEm = new Date(Date.now() + dados.validade_minutos * 60000).toISOString();
      setNovo({ codigo: dados.codigo, escopo: dados.escopo, expiraEm });
      await recarregar();
    } catch {
      setErro('Não foi possível gerar o código. Tente de novo.');
    } finally {
      setGerando(false);
    }
  };

  const revogar = async (id) => {
    try {
      await revogarAcesso(id);
      if (novo) setNovo(null);
      await recarregar();
    } catch {
      setErro('Não foi possível revogar este acesso.');
    }
  };

  const copiar = () => {
    navigator.clipboard?.writeText(novo.codigo).then(
      () => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      },
      () => setErro('Não foi possível copiar. Anote o código da tela.'),
    );
  };

  const restante = novo ? tempoRestante(novo.expiraEm, agora) : null;

  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <h2 className="header-title mb-2">Acesso do médico</h2>
      <p className="text-sm text-muted mb-6">
        Gere um código e mostre ao profissional durante o atendimento. Ele usa o
        código no portal do médico para ver seu resumo clínico e registrar o que
        foi feito na consulta.
      </p>

      {erro && <p className="empty-state mb-6">{erro}</p>}

      {/* Código recém-gerado: aparece uma única vez */}
      {novo && restante && (
        <div className="card codigo-card">
          <span className="codigo-label">Código do atendimento</span>
          <strong className="codigo-valor">{novo.codigo}</strong>
          <div className="codigo-rodape">
            <span className="codigo-timer">
              <Clock size={14} /> expira em {restante}
            </span>
            <button className="codigo-copiar" onClick={copiar}>
              {copiado ? <Check size={14} /> : <Copy size={14} />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="codigo-aviso">
            Anote agora: por segurança o código não fica guardado e não pode ser
            consultado depois.
          </p>
        </div>
      )}

      {/* Escolha do escopo + geração */}
      <h3 className="section-title">Novo acesso</h3>
      <div className="escopo-opcoes">
        <button
          className={`escopo-opcao ${escopo === 'leitura' ? 'active' : ''}`}
          onClick={() => setEscopo('leitura')}
        >
          <Eye size={18} />
          <span className="escopo-titulo">Somente leitura</span>
          <span className="escopo-desc">O médico vê seu resumo clínico, mas não altera nada.</span>
        </button>
        <button
          className={`escopo-opcao ${escopo === 'escrita' ? 'active' : ''}`}
          onClick={() => setEscopo('escrita')}
        >
          <PenLine size={18} />
          <span className="escopo-titulo">Leitura e registro</span>
          <span className="escopo-desc">O médico também registra a consulta e os exames.</span>
        </button>
      </div>

      <button className="btn-primary" onClick={gerar} disabled={gerando}>
        <KeyRound size={18} /> {gerando ? 'Gerando…' : 'Gerar código'}
      </button>

      <p className="acesso-nota">
        <ShieldCheck size={14} /> O código vale por 30 minutos, serve para um
        único médico e pode ser revogado a qualquer momento. Seu CPF, e-mail e
        endereço nunca são compartilhados.
      </p>

      <h3 className="section-title" style={{ marginTop: '24px' }}>Acessos concedidos</h3>
      {carregando ? (
        <p className="empty-state">Carregando…</p>
      ) : acessos.length === 0 ? (
        <p className="empty-state">Você ainda não concedeu nenhum acesso.</p>
      ) : (
        acessos.map((a) => {
          const situacao = situacaoAcesso(a, agora);
          const ativo = situacao === 'aguardando' || situacao === 'em-uso';
          return (
            <div key={a.id} className="card acesso-item">
              <div className="acesso-item-topo">
                <div>
                  <p className="font-bold">{a.medico || 'Ainda não utilizado'}</p>
                  <p className="text-xs text-muted">
                    {a.crm ? `CRM ${a.crm} · ` : ''}
                    {a.escopo === 'escrita' ? 'Leitura e registro' : 'Somente leitura'}
                  </p>
                </div>
                <StatusBadge status={STATUS_BADGE[situacao]} texto={ROTULO_SITUACAO[situacao]} />
              </div>

              <p className="text-xs text-muted">
                Gerado em {dataHora(a.criadoEm)}
                {a.usadoEm ? ` · usado em ${dataHora(a.usadoEm)}` : ''}
                {a.revogadoEm ? ` · revogado em ${dataHora(a.revogadoEm)}` : ''}
              </p>

              {ativo && (
                <button className="acesso-revogar" onClick={() => revogar(a.id)}>
                  <Ban size={14} /> Revogar agora
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
