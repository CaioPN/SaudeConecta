import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [paciente, setPaciente] = useState(null);

  // Ao carregar a aplicação, recupera o paciente salvo no localStorage.
  useEffect(() => {
    const salvo = localStorage.getItem('sc_paciente');
    if (salvo) {
      setPaciente(JSON.parse(salvo));
    }
  }, []);

  // Salva a sessão (paciente + token) no estado e no localStorage.
  function salvarSessao({ paciente, token }) {
    localStorage.setItem('sc_token', token);
    localStorage.setItem('sc_paciente', JSON.stringify(paciente));
    setPaciente(paciente);
  }

  // Cadastra um novo paciente (usuário principal).
  async function cadastrar(dados) {
    const { data } = await api.post('/auth/register', dados);
    salvarSessao(data);
    return data;
  }

  // Autentica um paciente existente contra o banco.
  async function entrar(email, senha) {
    const { data } = await api.post('/auth/login', { email, senha });
    salvarSessao(data);
    return data;
  }

  // Encerra a sessão.
  function sair() {
    localStorage.removeItem('sc_token');
    localStorage.removeItem('sc_paciente');
    setPaciente(null);
  }

  return (
    <AuthContext.Provider value={{ paciente, cadastrar, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para consumir o contexto de autenticação.
export function useAuth() {
  return useContext(AuthContext);
}
