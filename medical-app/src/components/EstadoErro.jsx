import React from 'react';
import { WifiOff, ServerCrash, LogIn, RotateCw } from 'lucide-react';
import { tipoDaFalha } from '../utils/falhas';

// O mesmo bloco em toda tela que não conseguiu carregar (critério INT03).
//
// `oQue` completa a frase ("os exames", "a carteira de vacinação"). O texto
// diz o que aconteceu e nunca o que os dados são: sem resposta do servidor,
// "nenhum exame" seria uma afirmação que o app não tem como fazer.
const TEXTOS = {
  sem_conexao: {
    Icone: WifiOff,
    titulo: 'Sem conexão',
    texto: (oQue) => `Não foi possível carregar ${oQue}. Confira a internet e tente de novo.`,
  },
  servidor: {
    Icone: ServerCrash,
    titulo: 'Não foi possível carregar',
    texto: (oQue) => `O servidor não conseguiu entregar ${oQue} agora. Tente de novo em instantes.`,
  },
  sessao: {
    Icone: LogIn,
    titulo: 'Sua sessão terminou',
    texto: () => 'Entre de novo na sua conta para continuar.',
  },
};

export default function EstadoErro({ erro, oQue = 'estas informações', onTentarDeNovo, compacto = false }) {
  const tipo = tipoDaFalha(erro);
  if (!tipo) return null;
  // 404 é decisão de cada tela (ela sabe o que "não encontrado" quer dizer);
  // aqui ele cai no texto genérico do servidor.
  const { Icone, titulo, texto } = TEXTOS[tipo] || TEXTOS.servidor;

  return (
    <div className={`estado-erro ${compacto ? 'compacto' : ''}`} role="alert">
      <Icone size={compacto ? 20 : 28} className="estado-erro-icone" />
      <div className="estado-erro-texto">
        <strong>{titulo}</strong>
        <p>{texto(oQue)}</p>
      </div>
      {onTentarDeNovo && tipo !== 'sessao' && (
        <button type="button" className="estado-erro-botao" onClick={onTentarDeNovo}>
          <RotateCw size={16} /> Tentar de novo
        </button>
      )}
    </div>
  );
}
