import React, { useState } from 'react';
import Modal from './Modal';
import ICONES from '../utils/icones';
import { explicar } from '../services/explicacoes';

const IconeAjuda = ICONES.explicacao;

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
 * @param {'exame'|'vacina'} tipo
 * @param {string} termo  Nome como aparece na tela — é só isto que sai do app.
 */
export default function BotaoExplicacao({ tipo, termo }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const abrir = async () => {
    setAberto(true);
    // Já buscou uma vez nesta tela: não pede de novo.
    if (texto || carregando) return;

    setCarregando(true);
    setErro('');
    try {
      setTexto(await explicar(tipo, termo));
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };

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
        {!carregando && !erro && texto && <p className="explicacao-texto">{texto}</p>}

        {/* O paciente precisa saber que quem escreveu foi uma máquina, e que
            isto não fala do resultado dele — é a definição do exame, não uma
            leitura do que deu. */}
        {!carregando && !erro && texto && (
          <p className="explicacao-rodape">
            Texto explicativo gerado por inteligência artificial. Vale para o item em
            geral e não avalia o seu resultado — quem interpreta é o profissional de saúde.
          </p>
        )}
      </Modal>
    </>
  );
}
