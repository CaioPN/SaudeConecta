import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { MODO_DEMO } from './demo/modo';
import { useAuth } from './context/AuthContext';
import { useAcessibilidade } from './context/AcessibilidadeContext';
import BottomNav from './components/BottomNav';
import MedicalChatbot from './components/MedicalChatbot';
import VLibras from './components/VLibras';
import Login from './screens/Login';
import Dashboard from './screens/Dashboard';
import PatientProfile from './screens/PatientProfile';
import MedicalRecord from './screens/MedicalRecord';
import Exams from './screens/Exams';
import Appointment from './screens/Appointment';
import Appointments from './screens/Appointments';
import AcessoMedico from './screens/AcessoMedico';
import HistoricoAcessos from './screens/HistoricoAcessos';
import PortalMedico from './screens/PortalMedico';
import Cadastro from './screens/Cadastro';
import RecuperarSenha from './screens/RecuperarSenha';
import Dependentes from './screens/Dependentes';
import Vacinas from './screens/Vacinas';
import RedeSaude from './screens/RedeSaude';
import Profile from './screens/Profile';
import Terms from './screens/Terms';
import Privacy from './screens/Privacy';
import Faq from './screens/Faq';
import FichaEmergencia from './screens/FichaEmergencia';
import MeusDados from './screens/MeusDados';
import PortaoTermos from './components/PortaoTermos';
import './app.css';

// Só a demonstração tem a avaliação da feira. Com o import dinâmico dentro do
// MODO_DEMO, o Vite descarta a tela do build normal.
// Usa import.meta.env direto, e não a constante MODO_DEMO importada: assim o
// Vite resolve a condição antes de separar os arquivos, e o pedaço some.
const AvaliarProjeto = import.meta.env.MODE === 'demo' ? lazy(() => import('./screens/AvaliarProjeto')) : null;

// A demonstração é publicada como arquivos estáticos (GitHub Pages), onde não
// há servidor para devolver o index.html em /dashboard ou /exams. Com `#` na
// rota, o caminho fica todo no navegador e qualquer link abre direto.
const Router = MODO_DEMO ? HashRouter : BrowserRouter;

export default function App() {
  // Texto maior por padrão a partir dos 50 anos (ver AcessibilidadeContext).
  // Mora aqui porque o provedor de acessibilidade fica FORA do AuthProvider —
  // para valer já no login — e não enxerga o paciente.
  const { paciente } = useAuth();
  const { sugerirFontePorIdade } = useAcessibilidade();
  const dataNascimento = paciente?.data_nascimento;
  useEffect(() => {
    if (dataNascimento) sugerirFontePorIdade(dataNascimento);
  }, [dataNascimento, sugerirFontePorIdade]);

  return (
    <Router>
      {/* Mobile viewport wrapper */}
      <div className="app-container">
        {MODO_DEMO && <div className="demo-selo">Demonstração</div>}
        <div className="app-content">
          {/* Com termos novos pendentes, o portão mostra o texto no lugar da
              tela pedida (exceto nas que abrem sem aceite). */}
          <PortaoTermos>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patient" element={<PatientProfile />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/record" element={<MedicalRecord />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/appointment" element={<Appointments />} />
            <Route path="/appointment/:id" element={<Appointment />} />
            <Route path="/dependentes" element={<Dependentes />} />
            <Route path="/vacinas" element={<Vacinas />} />
            <Route path="/emergencia" element={<FichaEmergencia />} />
            <Route path="/rede-saude" element={<RedeSaude />} />
            <Route path="/acesso-medico" element={<AcessoMedico />} />
            <Route path="/acessos-log" element={<HistoricoAcessos />} />
            <Route path="/meus-dados" element={<MeusDados />} />
            {/* Rota usada pelo profissional de saúde, fora do app do paciente. */}
            <Route path="/medico" element={<PortalMedico />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/faq" element={<Faq />} />
            {MODO_DEMO && (
              <Route
                path="/avaliar"
                element={<Suspense fallback={null}><AvaliarProjeto /></Suspense>}
              />
            )}
          </Routes>
          </PortaoTermos>
        </div>
        <BottomNav />
        <MedicalChatbot />
        <VLibras />
      </div>
    </Router>
  );
}