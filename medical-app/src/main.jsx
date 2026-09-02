import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { PessoasProvider } from './context/PessoasContext.jsx'
import { PrivacidadeProvider } from './context/PrivacidadeContext.jsx'

// O Vite por padrão cria uma div com id "app" ou "root".
// Verifique no seu index.html qual é o ID correto.
const rootElement = document.getElementById('root') || document.getElementById('app');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <PrivacidadeProvider>
      {/* PessoasProvider fica DENTRO do AuthProvider: ele precisa do paciente
          logado para montar a lista "titular + dependentes". */}
      <AuthProvider>
        <PessoasProvider>
          <App />
        </PessoasProvider>
      </AuthProvider>
    </PrivacidadeProvider>
  </React.StrictMode>,
)
