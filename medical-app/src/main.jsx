import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { PrivacidadeProvider } from './context/PrivacidadeContext.jsx'

// O Vite por padrão cria uma div com id "app" ou "root".
// Verifique no seu index.html qual é o ID correto.
const rootElement = document.getElementById('root') || document.getElementById('app');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <PrivacidadeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </PrivacidadeProvider>
  </React.StrictMode>,
)
