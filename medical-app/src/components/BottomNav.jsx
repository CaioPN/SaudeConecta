import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ICONES } from '../utils/icones';

// Abas da barra inferior. `rotas` lista o que pertence à aba além do destino:
// sem isso, entrar em /exams ou /vacinas apagava a barra inteira, e o usuário
// perdia a referência de onde estava justamente nas telas mais navegadas.
const ABAS = [
  { label: 'Início', icone: ICONES.inicio, destino: '/dashboard', rotas: [] },
  {
    label: 'Minha Saúde',
    icone: ICONES.saude,
    destino: '/patient',
    rotas: ['/record', '/exams', '/appointment', '/vacinas', '/dependentes'],
  },
  { label: 'Rede', icone: ICONES.rede, destino: '/rede-saude', rotas: [] },
];

// Telas em que a barra não aparece: login, cadastro e o portal do médico, que
// não é do paciente.
const SEM_BARRA = ['/', '/cadastro', '/medico'];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sair } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Fecha o menu ao clicar fora.
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fecha o menu ao trocar de tela (voltar pelo navegador, por exemplo).
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  if (SEM_BARRA.includes(location.pathname)) return null;

  // A aba acende também nas telas filhas: /appointment/12 pertence a
  // /appointment, que pertence a "Minha Saúde".
  const abaAtiva = (aba) =>
    [aba.destino, ...aba.rotas].some(
      (rota) => location.pathname === rota || location.pathname.startsWith(`${rota}/`)
    );

  const irPara = (path) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  // Sair de verdade: sem isso o token e os dados do paciente continuavam no
  // localStorage e o próximo a abrir o app entrava na conta.
  const encerrarSessao = () => {
    setIsMenuOpen(false);
    sair();
    navigate('/');
  };

  return (
    <div className="bottom-nav" ref={menuRef}>
      {isMenuOpen && (
        <div className="more-menu-overlay">
          <button onClick={() => irPara('/profile')} className="more-menu-item">
            <ICONES.perfil size={20} />
            <span>Meu perfil</span>
          </button>
          <button onClick={() => irPara('/faq')} className="more-menu-item">
            <ICONES.duvidas size={20} />
            <span>Dúvidas frequentes</span>
          </button>

          <div className="more-menu-divider"></div>
          <p className="more-menu-grupo">Privacidade</p>

          <button onClick={() => irPara('/acesso-medico')} className="more-menu-item">
            <ICONES.acessoMedico size={20} />
            <span>Acesso do médico</span>
          </button>
          <button onClick={() => irPara('/acessos-log')} className="more-menu-item">
            <ICONES.historicoAcessos size={20} />
            <span>Histórico de acessos</span>
          </button>
          <button onClick={() => irPara('/privacy')} className="more-menu-item">
            <ICONES.privacidade size={20} />
            <span>Portal de Privacidade</span>
          </button>
          <button onClick={() => irPara('/terms')} className="more-menu-item">
            <ICONES.termos size={20} />
            <span>Termos de Uso</span>
          </button>

          <div className="more-menu-divider"></div>
          <button onClick={encerrarSessao} className="more-menu-item logout">
            <ICONES.sair size={20} />
            <span>Sair</span>
          </button>
        </div>
      )}

      {ABAS.map((aba) => (
        <button
          key={aba.destino}
          onClick={() => irPara(aba.destino)}
          className={`nav-item ${abaAtiva(aba) ? 'active' : ''}`}
        >
          <aba.icone size={24} />
          <span>{aba.label}</span>
        </button>
      ))}

      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`nav-item ${isMenuOpen ? 'active' : ''}`}
      >
        <ICONES.mais size={24} />
        <span>Mais</span>
      </button>
    </div>
  );
}
