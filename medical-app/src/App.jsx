import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import MedicalChatbot from './components/MedicalChatbot';
import Login from './screens/Login';
import Dashboard from './screens/Dashboard';
import PatientProfile from './screens/PatientProfile';
import MedicalRecord from './screens/MedicalRecord';
import Exams from './screens/Exams';
import Appointment from './screens/Appointment';
import './app.css';

export default function App() {
  return (
    <Router>
      {/* Mobile viewport wrapper */}
      <div className="app-container">
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patient" element={<PatientProfile />} />
            <Route path="/record" element={<MedicalRecord />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/appointment" element={<Appointment />} />
          </Routes>
        </div>
        <BottomNav />
        <MedicalChatbot />
      </div>
    </Router>
  );
}