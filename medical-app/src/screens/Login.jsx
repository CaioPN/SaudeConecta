import React, { useState } from 'react';
import { Activity, Fingerprint, Eye, EyeOff, Info } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { MODO_DEMO } from '../demo/modo';

export default function Login() {
  const navigate = useNavigate();
  const { entrar } = useAuth();
  // Recado de quem mandou para cá — hoje, só a exclusão da conta. Vem pelo
  // state da navegação, e não pela URL, e some ao recarregar.
  const aviso = useLocation().state?.aviso;
  // Na demonstração o formulário já vem preenchido: quem chega pelo QR Code
  // da feira entra com um toque, sem ter de inventar uma conta.
  const [email, setEmail] = useState(MODO_DEMO ? 'gabriel@example.com' : '');
  const [password, setPassword] = useState(MODO_DEMO ? 'demonstracao' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia!';
    if (hour >= 12 && hour < 18) return 'Boa tarde!';
    return 'Boa noite!';
  };

  const handleLogin = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }
    if (!password) {
      setError('Por favor insira a senha');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await entrar(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.erro || 'Não foi possível entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="login-wrapper">

  <img
    src={logo}
    alt="Saúde Conecta"
    className="logo-image"
    style={{ marginBottom: '16px' }}
  />
  <div className="login-greeting">
    <h2>{getGreeting()}</h2>
    <p>Olá, seja bem-vindo(a) à Saúde Conecta.</p>
  </div>
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
          <div className="label-row">
            <label className="input-label">Senha</label>
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => navigate('/recuperar-senha')}
            >
              Esqueceu a senha?
            </button>
          </div>
          <div className="password-input-wrapper">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              className="input-field" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              style={{ paddingRight: '44px' }}
            />
            <button 
              type="button" 
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        {aviso && !error && <p className="form-ok" role="status">{aviso}</p>}
        {error && <p className="form-erro">{error}</p>}
        <button onClick={handleLogin} className="btn-primary" disabled={loading}>
          {loading ? 'ENTRANDO...' : 'ACESSAR CONTA'}
        </button>
        <button className="bio-btn">
          <Fingerprint size={24} />
          <span>Usar Biometria</span>
        </button>
      </div>
      
      <div className="login-footer">
        Não tem uma conta? <button type="button" onClick={() => navigate('/cadastro')} className="login-footer-link">Clique aqui.</button>
      </div>

      {MODO_DEMO && (
        <p className="demo-nota">
          <Info size={14} />
          <span>
            <strong>Demonstração do Saúde Conecta.</strong> Os dados são fictícios e ficam só
            neste navegador: recarregar a página volta tudo ao início. Para ver o lado do
            profissional, abra o{' '}
            <button type="button" onClick={() => navigate('/medico')}>portal do médico</button>
            {' '}— qualquer código entra.
          </span>
        </p>
      )}
    </div>
  );
}