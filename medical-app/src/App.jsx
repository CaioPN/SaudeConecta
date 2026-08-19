import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import Dependentes from './screens/Dependentes';
import Vacinas from './screens/Vacinas';
import RedeSaude from './screens/RedeSaude';
import Profile from './screens/Profile';
import Terms from './screens/Terms';
import Privacy from './screens/Privacy';
import Faq from './screens/Faq';
import './app.css';

export default function App() {
  return (
    <Router>
      {/* Mobile viewport wrapper */}
      <div className="app-container">
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patient" element={<PatientProfile />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/record" element={<MedicalRecord />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/appointment" element={<Appointments />} />
            <Route path="/appointment/:id" element={<Appointment />} />
            <Route path="/dependentes" element={<Dependentes />} />
            <Route path="/vacinas" element={<Vacinas />} />
            <Route path="/rede-saude" element={<RedeSaude />} />
            <Route path="/acesso-medico" element={<AcessoMedico />} />
            <Route path="/acessos-log" element={<HistoricoAcessos />} />
            {/* Rota usada pelo profissional de saúde, fora do app do paciente. */}
            <Route path="/medico" element={<PortalMedico />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/faq" element={<Faq />} />
          </Routes>
        </div>
        <BottomNav />
        <MedicalChatbot />
        <VLibras />
      </div>
    </Router>
  );
}