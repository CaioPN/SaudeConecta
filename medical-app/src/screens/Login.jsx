import React, { useState } from 'react';
import { Activity, Fingerprint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }
    setError('');
    navigate('/dashboard');
  };
  
  return (
  <div className="login-wrapper">

  <img
    src={logo}
    alt="Saúde Conecta"
    className="logo-image"
  />
      <div className="card" style={{ width: '100%' }}>
        <div className="input-group">
          <label className="input-label">E-mail</label>
          <input 
            type="email" 
            placeholder="exemplo@email.com" 
            className="input-field"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
          />
        </div>
        <div className="input-group">
          <label className="input-label">Senha</label>
          <input type="password" placeholder="••••••••" className="input-field" />
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}
        <button onClick={handleLogin} className="btn-primary">
          ACESSAR CONTA
        </button>
        <button className="bio-btn">
          <Fingerprint size={24} />
          <span>Usar Biometria</span>
        </button>
      </div>
    </div>
  );
}