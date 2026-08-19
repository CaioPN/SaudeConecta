import { createContext, useContext, useState } from 'react';

// Estado do "olhinho": quando ligado, as telas trocam os dados sensíveis do
// paciente (CPF, contato, endereço, resultados, diagnósticos) por marcadores.
//
// Começa aberto — o app existe para o paciente ver os próprios dados, e chegar
// numa tela toda mascarada seria estranho. O botão é para o momento em que tem
// alguém por perto. De propósito a escolha não é gravada: recarregar a página
// volta ao normal. É uma medida de exibição; o dado continua vindo da API.
const PrivacidadeContext = createContext(null);

export function PrivacidadeProvider({ children }) {
  const [oculto, setOculto] = useState(false);

  function alternar() {
    setOculto((atual) => !atual);
  }

  return (
    <PrivacidadeContext.Provider value={{ oculto, alternar }}>
      {children}
    </PrivacidadeContext.Provider>
  );
}

// Hook para consumir o estado de privacidade.
export function usePrivacidade() {
  return useContext(PrivacidadeContext);
}
