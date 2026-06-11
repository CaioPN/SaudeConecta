import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

// O Vite por padrão cria uma div com id "app" ou "root".
// Verifique no seu index.html qual é o ID correto.
const rootElement = document.getElementById('root') || document.getElementById('app');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)