import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

// O que fica gravado no aparelho é só o necessário para a tela abrir antes da
// API responder: quem é (id, nome, e-mail) e o que decide o tamanho do texto
// (data de nascimento) e o ícone (gênero). CPF, telefone, endereço e tipo
// sanguíneo vêm de GET /auth/me e moram só na memória — o localStorage é lido
// por qualquer script da página e sobrevive a fechar o navegador.
const CAMPOS_GRAVADOS = ['id', 'nome', 'email', 'data_nascimento', 'genero'];

function gravarPaciente(paciente) {
  const resumo = {};
  CAMPOS_GRAVADOS.forEach((campo) => {
    if (paciente?.[campo] !== undefined) resumo[campo] = paciente[campo];
  });
  localStorage.setItem('sc_paciente', JSON.stringify(resumo));
}

export function AuthProvider({ children }) {
  const [paciente, setPaciente] = useState(null);

  // Ao carregar a aplicação, recupera o resumo salvo e completa com a API.
  useEffect(() => {
    const salvo = localStorage.getItem('sc_paciente');
    if (!salvo || !localStorage.getItem('sc_token')) return;
    try {
      const resumo = JSON.parse(salvo);
      setPaciente(resumo);
      // Regrava já reduzido: quem entrou antes desta versão tinha o cadastro
      // inteiro, CPF incluído, guardado no aparelho.
      gravarPaciente(resumo);
    } catch {
      localStorage.removeItem('sc_paciente');
      return;
    }
    api.get('/auth/me')
      .then(({ data }) => { if (data?.paciente) setPaciente(data.paciente); })
      .catch((err) => {
        // Token vencido (7 dias) ou assinado com um segredo que mudou: sem
        // isto o app abria com cara de logado e toda tela falhava calada.
        if (err.response?.status === 401) sair();
      });
  }, []);

  // Salva a sessão (paciente + token) no estado e no localStorage.
  function salvarSessao({ paciente, token }) {
    localStorage.setItem('sc_token', token);
    gravarPaciente(paciente);
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

  // Troca os dados do paciente logado sem mexer no token.
  //
  // Existe por causa da edição de perfil: salvar no banco e não atualizar o
  // estado aqui deixaria a tela mostrando o telefone e o endereço antigos.
  function atualizarPaciente(novo) {
    gravarPaciente(novo);
    setPaciente(novo);
  }

  // Encerra a sessão.
  function sair() {
    localStorage.removeItem('sc_token');
    localStorage.removeItem('sc_paciente');
    setPaciente(null);
  }

  return (
    <AuthContext.Provider value={{ paciente, cadastrar, entrar, sair, atualizarPaciente }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para consumir o contexto de autenticação.
export function useAuth() {
  return useContext(AuthContext);
}
