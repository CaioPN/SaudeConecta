import React, { useState } from 'react';
import Modal from './Modal';
import ICONES from '../utils/icones';
import { explicar, reportarExplicacao } from '../services/explicacoes';

const IconeAjuda = ICONES.explicacao;

// Os motivos do relato. Lista fechada, de propósito: num campo livre o
// paciente escreveria o próprio resultado, e o relato não guarda dado clínico.
const MOTIVOS = [
  { valor: 'errado', rotulo: 'Informação errada' },
  { valor: 'confuso', rotulo: 'Difícil de entender' },
  { valor: 'resultado', rotulo: 'Parece falar do meu resultado' },
];

/**
 * O "?" ao lado do nome de um exame ou de uma vacina: abre uma janelinha
 * explicando o que aquilo é, em linguagem de paciente.
 *
 * A busca é preguiçosa — só acontece quando alguém toca no botão. Numa coleta
 * de sangue com doze itens, carregar tudo de uma vez seria doze requisições
 * para um texto que talvez ninguém abra.
 *
 * O texto vem do banco a partir da segunda vez que alguém pergunta aquele
 * termo, então normalmente aparece na hora (ver ExplicacaoDAO.java).
 *
 * Embaixo do texto fica o "Este texto tem algum problema?": o verbete é
 * escrito por IA e mostrado a todos sem aprovação prévia, e este é o caminho
 * de volta. Com relatos de pessoas diferentes ele sai do ar até ser revisado.
 *
 * @param {'exame'|'vacina'} tipo
 * @param {string} termo  Nome como aparece na tela — é só isto que sai do app.
 */
export default function BotaoExplicacao({ tipo, termo }) {
  const [aberto, setAberto] = useState(false);
  const [explicacao, setExplicacao] = useState(null); // { texto, revisado }
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  // null | 'escolhendo' | 'enviando' | 'enviado' | 'suspensa' | mensagem de erro
  const [relato, setRelato] = useState(null);

  const abrir = async () => {
    setAberto(true);
    // Já buscou uma vez nesta tela: não pede de novo.
    if (explicacao || carregando) return;

    setCarregando(true);
    setErro('');
    try {
      setExplicacao(await explicar(tipo, termo));
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };

  const reportar = async (motivo) => {
    setRelato('enviando');
    try {
      const { suspensa } = await reportarExplicacao(tipo, termo, motivo);
      setRelato(suspensa ? 'suspensa' : 'enviado');
    } catch (e) {
      setRelato(e.message);
    }
  };

  const mostrandoTexto = !carregando && !erro && explicacao;

  return (
    <>
      <button
        type="button"
        className="botao-explicacao"
        onClick={abrir}
        aria-label={`O que é ${termo}?`}
        title={`O que é ${termo}?`}
      >
        <IconeAjuda size={15} />
      </button>

      <Modal open={aberto} title={termo} onClose={() => setAberto(false)}>
        {carregando && <p className="explicacao-estado">Carregando…</p>}
        {!carregando && erro && <p className="explicacao-estado erro">{erro}</p>}
        {mostrandoTexto && <p className="explicacao-texto">{explicacao.texto}</p>}

        {/* O paciente precisa saber que quem escreveu foi uma máquina, se uma
            pessoa já conferiu, e que isto não fala do resultado dele — é a
            definição do exame, não uma leitura do que deu. */}
        {mostrandoTexto && (
          <p className="explicacao-rodape">
            {explicacao.revisado
              ? 'Texto gerado por inteligência artificial e conferido pela equipe do app.'
              : 'Texto explicativo gerado por inteligência artificial, ainda não revisado por uma pessoa.'}
            {' '}Vale para o item em geral e não avalia o seu resultado — quem
            interpreta é o profissional de saúde.
          </p>
        )}

        {mostrandoTexto && (
          <div className="explicacao-relato">
            {relato === null && (
              <button type="button" className="explicacao-relato-link" onClick={() => setRelato('escolhendo')}>
                Este texto tem algum problema?
              </button>
            )}
            {(relato === 'escolhendo' || relato === 'enviando') && (
              <>
                <p className="explicacao-relato-titulo">O que há de errado?</p>
                <div className="explicacao-relato-opcoes">
                  {MOTIVOS.map((m) => (
                    <button
                      key={m.valor}
                      type="button"
                      className="explicacao-relato-opcao"
                      onClick={() => reportar(m.valor)}
                      disabled={relato === 'enviando'}
                    >
                      {m.rotulo}
                    </button>
                  ))}
                </div>
              </>
            )}
            {relato === 'enviado' && (
              <p className="explicacao-relato-titulo">
                Obrigado. O relato foi registrado e o texto será revisado.
              </p>
            )}
            {relato === 'suspensa' && (
              <p className="explicacao-relato-titulo">
                Obrigado. Com o seu relato, este texto saiu do ar até ser revisado.
              </p>
            )}
            {relato && !['escolhendo', 'enviando', 'enviado', 'suspensa'].includes(relato) && (
              <p className="explicacao-estado erro">{relato}</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
