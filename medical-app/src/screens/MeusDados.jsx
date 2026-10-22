import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, Trash2, CheckCircle2, ScrollText, AlertTriangle } from 'lucide-react';
import useVoltar from '../hooks/useVoltar';
import { useAuth } from '../context/AuthContext';
import EstadoErro from '../components/EstadoErro';
import { mensagemDaAcao, tipoDaFalha } from '../utils/falhas';
import { situacaoDosTermos } from '../services/termos';
import { baixarMeusDados, resumoDaConta, excluirConta } from '../services/conta';
import { DATA_TERMOS } from '../content/LegalContent';
import ICONES from '../utils/icones';

// "2026-10-21T14:30:05" -> "21/10/2026 às 14:30", como no Histórico de acessos.
function dataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} às ${hora}`;
}

// O que vai junto na exclusão, na ordem e com o nome que o paciente entende.
const ROTULOS_RESUMO = [
  ['dependentes', 'dependente', 'dependentes'],
  ['consultas', 'consulta', 'consultas'],
  ['exames', 'exame', 'exames'],
  ['itens_prontuario', 'item do prontuário', 'itens do prontuário'],
  ['vacinas', 'dose de vacina registrada', 'doses de vacina registradas'],
  ['contatos', 'contato de emergência', 'contatos de emergência'],
];

/**
 * Meus dados — os direitos do titular da LGPD (art. 18) num lugar só: qual
 * versão dos termos a pessoa aceitou, baixar uma cópia de tudo e excluir a
 * conta. Abre mesmo com termos novos pendentes (ver PortaoTermos): recusar o
 * texto novo não pode tirar de ninguém o direito de levar ou apagar os dados.
 */
export default function MeusDados() {
  const voltar = useVoltar('/dashboard');
  const navigate = useNavigate();
  const { sair } = useAuth();

  // --- termos
  const [termos, setTermos] = useState(null);
  const [erroTermos, setErroTermos] = useState(null);
  const [tentativaTermos, setTentativaTermos] = useState(0);

  useEffect(() => {
    let ativo = true;
    setErroTermos(null);
    situacaoDosTermos()
      .then((s) => { if (ativo) setTermos(s); })
      .catch((falha) => { if (ativo) setErroTermos(falha); });
    return () => { ativo = false; };
  }, [tentativaTermos]);

  // --- exportação
  const [baixando, setBaixando] = useState(false);
  const [baixado, setBaixado] = useState(null);
  const [erroBaixar, setErroBaixar] = useState(null);

  const baixar = async () => {
    setBaixando(true);
    setBaixado(null);
    setErroBaixar(null);
    try {
      const arquivo = await baixarMeusDados();
      const total = Object.values(arquivo.dados || {})
        .reduce((soma, lista) => soma + (Array.isArray(lista) ? lista.length : 0), 0);
      setBaixado(total);
    } catch (falha) {
      setErroBaixar(mensagemDaAcao(falha, 'Não foi possível gerar o arquivo. Tente de novo.'));
    } finally {
      setBaixando(false);
    }
  };

  // --- exclusão
  const [excluindo, setExcluindo] = useState(false); // formulário aberto
  const [resumo, setResumo] = useState(null);
  const [erroResumo, setErroResumo] = useState(null);
  const [senha, setSenha] = useState('');
  const [entendi, setEntendi] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroExcluir, setErroExcluir] = useState(null);

  const carregarResumo = () => {
    setResumo(null);
    setErroResumo(null);
    resumoDaConta().then(setResumo).catch(setErroResumo);
  };

  const abrirExclusao = () => {
    setExcluindo(true);
    setSenha('');
    setEntendi(false);
    setErroExcluir(null);
    carregarResumo();
  };

  const confirmarExclusao = async (evento) => {
    evento.preventDefault();
    setEnviando(true);
    setErroExcluir(null);
    try {
      await excluirConta(senha);
      // Só depois da confirmação do servidor: sem resposta, a tela não pode
      // dizer que a conta foi excluída.
      sair();
      navigate('/', { replace: true, state: { aviso: 'Sua conta e todos os dados dela foram excluídos.' } });
    } catch (falha) {
      setErroExcluir(
        tipoDaFalha(falha) === 'sem_conexao'
          ? 'Sem conexão: a conta NÃO foi excluída. Confira a internet e tente de novo.'
          : mensagemDaAcao(falha, 'Não foi possível excluir a conta. Nada foi apagado.'),
      );
      setEnviando(false);
    }
  };

  const itensDoResumo = resumo
    ? ROTULOS_RESUMO
      .filter(([chave]) => resumo[chave] > 0)
      .map(([chave, um, varios]) => `${resumo[chave]} ${resumo[chave] === 1 ? um : varios}`)
    : [];

  return (
    <div className="screen-container tela-rolagem">
      <div className="tela-topo">
        <button onClick={() => voltar()} className="back-btn">
          <ChevronLeft size={20} /> Voltar
        </button>
        <div className="flex items-center gap-4 mb-2">
          <div className="icon-box"><ICONES.meusDados size={24} /></div>
          <h2 className="header-title">Meus dados</h2>
        </div>
        <p className="header-subtitle">Os seus direitos pela LGPD: saber, levar e apagar.</p>
      </div>

      <div className="tela-lista">
        {/* ---------- Termos aceitos ---------- */}
        <h3 className="section-title">Termos de Uso e Privacidade</h3>
        <div className="card">
          {erroTermos ? (
            <EstadoErro compacto erro={erroTermos} oQue="o registro do seu aceite"
              onTentarDeNovo={() => setTentativaTermos((t) => t + 1)} />
          ) : !termos ? (
            <p className="text-sm text-muted">Carregando…</p>
          ) : termos.aceito ? (
            <p className="text-sm meus-dados-linha">
              <CheckCircle2 size={18} className="meus-dados-ok" />
              <span>
                Você aceitou a versão de <strong>{DATA_TERMOS}</strong> em {dataHora(termos.aceitoEm)}.
              </span>
            </p>
          ) : (
            <p className="text-sm meus-dados-linha">
              <AlertTriangle size={18} className="text-red" />
              <span>Não há aceite registrado da versão de <strong>{DATA_TERMOS}</strong>.</span>
            </p>
          )}
          <div className="form-botoes">
            <button className="btn-secondary" onClick={() => navigate('/terms')}>
              <ScrollText size={18} /> Termos de Uso
            </button>
            <button className="btn-secondary" onClick={() => navigate('/privacy')}>
              <ICONES.privacidade size={18} /> Privacidade
            </button>
          </div>
        </div>

        {/* ---------- Portabilidade ---------- */}
        <h3 className="section-title">Baixar uma cópia dos meus dados</h3>
        <div className="card">
          <p className="text-sm text-muted mb-4">
            Um arquivo JSON com tudo o que o app guarda sobre você e os seus dependentes:
            cadastro, consultas, exames, prontuário, vacinas, contatos, os acessos que você
            concedeu e o histórico de acessos. Serve para levar os dados a outro sistema.
          </p>
          <p className="pdf-nota mb-4">
            <AlertTriangle size={13} />
            O arquivo não tem senha e traz o seu CPF e o prontuário inteiro. Guarde-o em
            lugar seguro e não o envie por mensagem.
          </p>
          {erroBaixar && <p className="form-erro" role="alert">{erroBaixar}</p>}
          {baixado !== null && (
            <p className="form-ok" role="status">
              <CheckCircle2 size={16} /> Arquivo baixado com {baixado} registro(s).
            </p>
          )}
          <button className="btn-primary" onClick={baixar} disabled={baixando}>
            <Download size={18} /> {baixando ? 'Gerando o arquivo…' : 'Baixar meus dados (JSON)'}
          </button>
        </div>

        {/* ---------- Exclusão ---------- */}
        <h3 className="section-title text-red">Excluir minha conta</h3>
        <div className="card border-red">
          {!excluindo ? (
            <>
              <p className="text-sm text-muted mb-4">
                Apaga a sua conta e tudo o que depende dela, inclusive os dependentes e o
                histórico de acessos. Não dá para desfazer. Se quiser guardar uma cópia,
                baixe os seus dados antes.
              </p>
              <button className="btn-secondary btn-perigo" onClick={abrirExclusao}>
                <Trash2 size={18} /> Quero excluir minha conta
              </button>
            </>
          ) : (
            <form onSubmit={confirmarExclusao}>
              <p className="text-sm font-bold mb-2">Vai ser apagado definitivamente:</p>
              {erroResumo ? (
                // Sem a contagem, a tela não diz "nada será apagado": diz que
                // não conseguiu contar, e a pessoa decide se segue assim.
                <EstadoErro compacto erro={erroResumo} oQue="o resumo da sua conta"
                  onTentarDeNovo={carregarResumo} />
              ) : !resumo ? (
                <p className="text-sm text-muted mb-4">Contando…</p>
              ) : (
                <ul className="meus-dados-resumo">
                  <li>o seu cadastro e o login</li>
                  {itensDoResumo.map((t) => <li key={t}>{t}</li>)}
                  <li>os acessos de médicos e o histórico de acessos</li>
                </ul>
              )}

              <div className="input-group">
                <label className="input-label" htmlFor="senha-exclusao">Digite a sua senha para confirmar</label>
                <input
                  id="senha-exclusao"
                  type="password"
                  className="input-field"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>

              <label className="consent-row mb-4">
                <input type="checkbox" checked={entendi} onChange={(e) => setEntendi(e.target.checked)} />
                <span>Entendo que a exclusão é definitiva e não pode ser desfeita.</span>
              </label>

              {erroExcluir && <p className="form-erro" role="alert">{erroExcluir}</p>}

              <div className="form-botoes">
                <button type="button" className="btn-secondary" onClick={() => setExcluindo(false)} disabled={enviando}>
                  Cancelar
                </button>
                <button type="submit" className="btn-excluir" disabled={!senha || !entendi || enviando}>
                  <Trash2 size={18} /> {enviando ? 'Excluindo…' : 'Excluir definitivamente'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
