import React, { useEffect, useState } from 'react';
import { ChevronLeft, AlertCircle, Heart, Pill, Phone, Droplet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePessoas } from '../context/PessoasContext';
import SeletorPessoa from '../components/SeletorPessoa';
import { ICONES } from '../utils/icones';
import { buscarProntuario } from '../services/prontuario';
import { listarFamiliares } from '../services/familiares';

const IconeEmergencia = ICONES.emergencia;

// Preferência de exibição (não é dado de saúde): se os contatos de emergência
// aparecem na ficha. Gravada no aparelho, como o tamanho do texto.
const CHAVE_CONTATOS = 'sc_ficha_contatos';

function lerMostrarContatos() {
  try {
    return localStorage.getItem(CHAVE_CONTATOS) === 'sim';
  } catch {
    return false;
  }
}

function calcularIdade(dataIso) {
  if (!dataIso) return null;
  const nasc = new Date(`${dataIso}T00:00:00`);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

// "11987654321" -> "tel:11987654321". Só dígitos: espaço e traço quebram o
// discador de alguns aparelhos.
const linkTelefone = (tel) => `tel:${String(tel || '').replace(/\D/g, '')}`;

/**
 * Ficha de emergência: o que um socorrista precisa saber em dez segundos.
 *
 * O resto do app é para o paciente acompanhar a própria saúde; esta tela é para
 * OUTRA pessoa ler — o SAMU, a triagem do pronto-socorro — quando o paciente
 * talvez nem consiga falar. Por isso ela é diferente das demais:
 *
 * - letra grande e só o essencial: tipo sanguíneo, alergias, condições e
 *   medicações em uso. Nada de exame, consulta ou histórico;
 * - **ignora o "olhinho"**: quem abre a ficha está escolhendo mostrá-la, e uma
 *   ficha com bolinhas no lugar da alergia não serve para nada;
 * - "nenhuma registrada" é dito com todas as letras e com a ressalva de que é
 *   o que está NO APP — para o socorrista, "não tem alergia" e "ninguém
 *   cadastrou" são coisas bem diferentes;
 * - **contato de emergência é opt-in**: é nome e telefone de outra pessoa, que
 *   não consentiu com nada aqui. Ele só aparece se o paciente ligar a opção no
 *   fim da tela, como no código de acesso do médico. Já o telefone do
 *   responsável, na ficha de um dependente, é do próprio titular.
 *
 * Nada é guardado no aparelho além da preferência dos contatos: a ficha vem da
 * API a cada abertura, como o prontuário (a leitura entra na trilha como
 * `consultou_prontuario`).
 */
export default function FichaEmergencia() {
  const navigate = useNavigate();
  const { paciente } = useAuth();
  const { pessoa, dependenteId } = usePessoas();
  const [prontuario, setProntuario] = useState(null);
  const [contatos, setContatos] = useState([]);
  const [mostrarContatos, setMostrarContatos] = useState(lerMostrarContatos);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;
    setProntuario(null);
    setErro(null);
    buscarProntuario(dependenteId)
      .then((dados) => { if (ativo) setProntuario(dados); })
      .catch(() => { if (ativo) setErro('Não foi possível carregar a ficha. Verifique a conexão.'); });
    return () => { ativo = false; };
  }, [dependenteId]);

  // Os contatos só são buscados se a opção estiver ligada: o que não vai ser
  // mostrado não precisa nem sair do servidor.
  useEffect(() => {
    if (!mostrarContatos) {
      setContatos([]);
      return undefined;
    }
    let ativo = true;
    listarFamiliares()
      .then((lista) => { if (ativo) setContatos(lista); })
      .catch(() => { if (ativo) setContatos([]); });
    return () => { ativo = false; };
  }, [mostrarContatos]);

  const alternarContatos = () => {
    const novo = !mostrarContatos;
    setMostrarContatos(novo);
    try {
      localStorage.setItem(CHAVE_CONTATOS, novo ? 'sim' : 'nao');
    } catch {
      // Armazenamento bloqueado: a escolha vale até fechar a tela.
    }
  };

  const idade = calcularIdade(pessoa.data_nascimento);

  return (
    <div className="screen-container tela-rolagem">
      <div className="tela-topo">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ChevronLeft size={20} /> Voltar
        </button>
        <SeletorPessoa />
      </div>

      <div className="tela-lista">
        <div className="ficha-cabecalho">
          <div className="ficha-titulo">
            <IconeEmergencia size={20} /> Ficha de emergência
          </div>
          <p className="ficha-nome">{pessoa.nome}</p>
          {idade !== null && <p className="ficha-idade">{idade} {idade === 1 ? 'ano' : 'anos'}</p>}
          <div className="ficha-sangue">
            <Droplet size={22} />
            <span>Tipo sanguíneo</span>
            <strong>{pessoa.tipo_sanguineo || 'não informado'}</strong>
          </div>
        </div>

        {!prontuario && !erro && <p className="empty-state">Carregando a ficha…</p>}
        {erro && <p className="empty-state">{erro}</p>}

        {prontuario && (
          <>
            <div className="ficha-bloco alerta">
              <h3 className="ficha-bloco-titulo"><AlertCircle size={20} /> Alergias</h3>
              {prontuario.alergias.length === 0 ? (
                <p className="ficha-vazio">Nenhuma alergia registrada no app.</p>
              ) : (
                prontuario.alergias.map((a) => (
                  <p key={a.id} className="ficha-item">
                    {a.descricao}
                    {/* Para o socorrista, "declarada pelo paciente" e "registrada
                        por um médico" pesam diferente: os dois aparecem, marcados. */}
                    {a.origem === 'paciente' && <span className="ficha-origem">informada pelo paciente</span>}
                  </p>
                ))
              )}
            </div>

            <div className="ficha-bloco">
              <h3 className="ficha-bloco-titulo"><Heart size={20} /> Condições</h3>
              {prontuario.condicoes.length === 0 ? (
                <p className="ficha-vazio">Nenhuma condição registrada no app.</p>
              ) : (
                prontuario.condicoes.map((c) => (
                  <p key={c.id} className="ficha-item">
                    {c.descricao}
                    {c.origem === 'paciente' && <span className="ficha-origem">informada pelo paciente</span>}
                  </p>
                ))
              )}
            </div>

            <div className="ficha-bloco">
              <h3 className="ficha-bloco-titulo"><Pill size={20} /> Medicações em uso</h3>
              {prontuario.medicacoes.length === 0 ? (
                <p className="ficha-vazio">Nenhuma medicação registrada no app.</p>
              ) : (
                prontuario.medicacoes.map((m) => (
                  <div key={m.id} className="ficha-medicacao">
                    <p className="ficha-item">{m.nome}</p>
                    {m.posologia && <p className="ficha-detalhe">{m.posologia}</p>}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Na ficha de um dependente, quem responde por ele é o titular — o
            telefone é do próprio dono da conta, não de terceiro. */}
        {!pessoa.titular && (
          <div className="ficha-bloco">
            <h3 className="ficha-bloco-titulo"><Phone size={20} /> Responsável</h3>
            <p className="ficha-item">{paciente?.nome}</p>
            {paciente?.telefone && (
              <a className="ficha-ligar" href={linkTelefone(paciente.telefone)}>
                <Phone size={16} /> Ligar · {paciente.telefone}
              </a>
            )}
          </div>
        )}

        {mostrarContatos && (
          <div className="ficha-bloco">
            <h3 className="ficha-bloco-titulo"><Phone size={20} /> Contatos de emergência</h3>
            {contatos.length === 0 ? (
              <p className="ficha-vazio">Nenhum contato cadastrado. Cadastre no seu perfil.</p>
            ) : (
              contatos.map((c) => (
                <div key={c.id} className="ficha-contato">
                  <p className="ficha-item">{c.nome} <span className="ficha-detalhe">({c.parentesco})</span></p>
                  <a className="ficha-ligar" href={linkTelefone(c.telefone)}>
                    <Phone size={16} /> Ligar · {c.telefone}
                  </a>
                </div>
              ))
            )}
          </div>
        )}

        <a className="ficha-samu" href="tel:192">
          <IconeEmergencia size={20} /> Emergência: ligar 192 (SAMU)
        </a>

        <p className="ficha-rodape">
          Informações registradas no Saúde Conecta pelo paciente e pelos
          profissionais que o atenderam. Sempre que possível, confirme com o
          paciente ou o responsável.
        </p>

        {/* Configuração da própria ficha, no fim: quem mostra a tela para o
            socorrista não deve encontrar um botão no caminho. */}
        <div className="card ficha-config">
          <div className="acessibilidade-linha">
            <div>
              <p className="font-bold text-sm">Mostrar contatos de emergência</p>
              <p className="text-xs text-muted">
                São nome e telefone de outras pessoas: só aparecem na ficha se você ligar.
              </p>
            </div>
            <button
              type="button"
              className={`acessibilidade-opcao tamanho-padrao ${mostrarContatos ? 'active' : ''}`}
              style={{ flex: '0 0 auto', padding: '10px 14px' }}
              onClick={alternarContatos}
              aria-pressed={mostrarContatos}
            >
              {mostrarContatos ? 'Ligado' : 'Desligado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
