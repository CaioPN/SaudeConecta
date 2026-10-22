import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScrollText, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { situacaoDosTermos, aceitarTermos } from '../services/termos';
import { TermsContent, PrivacyContent, VERSAO_TERMOS, DATA_TERMOS } from '../content/LegalContent';
import { mensagemDaAcao } from '../utils/falhas';

// Telas que abrem sem precisar do aceite: as de antes do login, os próprios
// textos legais (a pessoa tem de poder lê-los), o portal do médico, que é de
// outra pessoa, e Meus dados: quem não aceita o texto novo continua tendo
// direito de levar os próprios dados e de excluir a conta (LGPD, art. 18) —
// recusar os termos não pode virar um jeito de prender o prontuário aqui.
const LIVRES = ['/', '/cadastro', '/recuperar-senha', '/terms', '/privacy', '/medico', '/meus-dados'];

/**
 * Pede o aceite da versão vigente dos termos antes de deixar usar o app.
 *
 * Só bloqueia quando o SERVIDOR responde que a versão vigente não foi aceita.
 * Se a consulta falhar (sem internet, banco sem a tabela nova), o app segue —
 * mas sem afirmar nada: a tela "Meus dados" é que mostra se há aceite
 * registrado. Trancar a pessoa fora dos próprios dados porque a rede caiu
 * seria pior do que deixar a pergunta para o próximo acesso.
 */
export default function PortaoTermos({ children }) {
  const { paciente, sair } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendente, setPendente] = useState(false);
  const [marcado, setMarcado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const idPaciente = paciente?.id;
  useEffect(() => {
    if (!idPaciente) {
      setPendente(false);
      return undefined;
    }
    let ativo = true;
    situacaoDosTermos()
      .then((s) => { if (ativo) setPendente(!s.aceito); })
      .catch(() => { if (ativo) setPendente(false); });
    return () => { ativo = false; };
  }, [idPaciente]);

  if (!pendente || LIVRES.includes(location.pathname)) return children;

  const aceitar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      const s = await aceitarTermos(VERSAO_TERMOS);
      // Só sai da tela com a confirmação do servidor de que ficou registrado.
      setPendente(!s.aceito);
    } catch (falha) {
      setErro(mensagemDaAcao(falha, 'Não foi possível registrar o aceite. Tente de novo.'));
    } finally {
      setEnviando(false);
    }
  };

  const recusar = () => {
    sair();
    navigate('/');
  };

  return (
    <div className="screen-container tela-rolagem">
      <div className="tela-topo">
        <div className="flex items-center gap-4 mb-2">
          <div className="icon-box"><ScrollText size={24} /></div>
          <h2 className="header-title">Os termos mudaram</h2>
        </div>
        <p className="header-subtitle">
          Versão de {DATA_TERMOS}. Leia e aceite para continuar usando o app.
        </p>
      </div>

      <div className="tela-lista sem-barra">
        <div className="card">
          <h3 className="section-title">Termos de Uso</h3>
          <TermsContent />
        </div>
        <div className="card">
          <h3 className="section-title">Uso dos Dados e Privacidade</h3>
          <PrivacyContent />
        </div>

        <label className="consent-row mb-4">
          <input type="checkbox" checked={marcado} onChange={(e) => setMarcado(e.target.checked)} />
          <span>Li e aceito os Termos de Uso e a Política de Privacidade desta versão.</span>
        </label>

        {erro && <p className="form-erro" role="alert">{erro}</p>}

        <button className="btn-primary" disabled={!marcado || enviando} onClick={aceitar}>
          {enviando ? 'Registrando…' : 'Aceitar e continuar'}
        </button>
        <button className="btn-secondary mt-4" onClick={recusar} disabled={enviando}>
          <LogOut size={18} /> Não aceito, sair
        </button>
        <p className="text-xs text-muted mt-4">
          Não quer aceitar? Você ainda pode{' '}
          <button type="button" className="consent-link" onClick={() => navigate('/meus-dados')}>
            baixar os seus dados ou excluir a conta
          </button>.
        </p>
      </div>
    </div>
  );
}
