import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { perguntarIA } from '../services/chatbot';

// Base de conhecimento do assistente: cada item tem palavras-chave e uma resposta.
// O primeiro item cujas palavras-chave aparecerem na mensagem é usado como resposta.
const BASE_CONHECIMENTO = [
    {
        chaves: ['agendar', 'agendamento', 'consulta', 'marcar', 'médico', 'medico'],
        resposta:
            'Suas consultas ficam em "Início" → "Consultas" (ou em "Minha Saúde"), separadas entre as próximas e as anteriores. ' +
            'Toque em uma delas para ver o local, o profissional, o resumo e a conduta.',
    },
    {
        chaves: ['exame', 'exames', 'resultado', 'sangue', 'hemograma', 'imagem', 'laudo'],
        resposta:
            'Seus exames ficam em "Minha Saúde" → "Exames". Você pode ver os resultados de sangue e de imagem, ' +
            'e ainda baixar um relatório em PDF com todo o histórico pelo botão "Baixar PDF". ' +
            'O PDF abre com senha: os 4 primeiros dígitos do seu CPF.',
    },
    {
        chaves: ['pdf', 'baixar pdf', 'relatorio', 'relatório', 'senha do pdf', 'arquivo'],
        resposta:
            'O botão "Baixar PDF", na tela de Exames, gera um relatório com todas as coletas e os exames de imagem. ' +
            'O arquivo é protegido: para abri-lo, digite os 4 primeiros dígitos do seu CPF.',
    },
    {
        chaves: ['ocultar', 'esconder', 'olhinho', 'olho', 'mascarar', 'bolinhas', 'por cima do ombro'],
        resposta:
            'O botão do olhinho aparece no topo do seu perfil, do prontuário, dos exames e dos avisos. ' +
            'Fechado, ele troca os dados sensíveis por bolinhas; um toque mostra tudo de novo. ' +
            'Os dados aparecem normalmente quando o app é aberto.',
    },
    {
        chaves: ['dependente', 'dependentes', 'filho', 'filha', 'família', 'familia'],
        resposta:
            'Você gerencia dependentes em "Minha Saúde" → "Dependentes". Para VER os dados de um deles, use o ' +
            'seletor no topo de Exames, Consultas, Prontuário e Carteira de Vacinação — a escolha vale para ' +
            'essas telas todas ao mesmo tempo, e volta para você ao recarregar o app.',
    },
    {
        chaves: ['contato de emergencia', 'contato de emergência', 'emergencia contato',
                 'avisar', 'parentesco', 'quem avisar', 'familiar'],
        resposta:
            'Os contatos de emergência ficam em "Mais" → "Meu perfil", no fim da tela: nome, parentesco e ' +
            'telefone de quem deve ser procurado. Eles são só seus — não entram no resumo que o médico recebe ' +
            'pelo código de acesso, porque o telefone é de outra pessoa.',
    },
    {
        chaves: ['notificação', 'notificacao', 'notificações', 'notificacoes', 'novidades',
                 'aviso do medico', 'aviso do médico'],
        resposta:
            'Quando um profissional registra uma consulta, um exame ou um item do prontuário com um código ' +
            'seu, aparece o bloco "Novidades" na tela inicial dizendo o que foi feito e por quem. A mensagem ' +
            'não traz diagnóstico nem resultado — para isso você abre a tela correspondente.',
    },
    {
        chaves: ['código do médico', 'codigo do medico', 'acesso do médico', 'acesso do medico',
                 'mostrar ao médico', 'mostrar ao medico', 'consultório', 'consultorio'],
        resposta:
            'Em "Mais" → "Acesso do médico" você gera um código de 30 minutos. O seletor do topo decide de quem ' +
            'é o prontuário que ele abre: você ou um dependente. Há duas permissões, "somente leitura" e ' +
            '"leitura e registro", e uma opção separada para enviar junto os seus contatos de emergência — ' +
            'desmarcada por padrão, porque são dados de outra pessoa. Você pode revogar o acesso a qualquer momento.',
    },
    {
        chaves: ['prontuário', 'prontuario', 'histórico', 'historico', 'alergia', 'condição', 'condicao'],
        resposta:
            'No seu prontuário ("Minha Saúde" → "Prontuário") você encontra alergias, condições de saúde e os registros ' +
            'recentes das suas consultas.',
    },
    {
        chaves: ['editar perfil', 'corrigir', 'mudar telefone', 'trocar endereço', 'trocar endereco',
                 'atualizar cadastro', 'meus dados'],
        resposta:
            'Telefone e endereço você mesmo corrige: abra "Perfil" e toque em "Editar". Nome, CPF, data de ' +
            'nascimento, gênero e tipo sanguíneo não são editáveis pela tela, porque identificam você no ' +
            'atendimento. Toda alteração fica registrada no seu histórico de acessos.',
    },
    {
        chaves: ['senha', 'login', 'entrar', 'esqueci', 'acesso', 'biometria', 'recuperar senha'],
        resposta:
            'Sua senha precisa ter ao menos 8 caracteres, com maiúscula, minúscula, número e caractere especial. ' +
            'Se esqueceu, toque em "Esqueceu a senha?" no login: o app confere e-mail, CPF e data de nascimento ' +
            'do seu cadastro e deixa você escolher a nova senha na hora. A troca fica no histórico de acessos.',
    },
    {
        chaves: ['vacina', 'vacinação', 'vacinacao', 'imunização', 'imunizacao', 'dose', 'atraso'],
        resposta:
            'A Carteira de Vacinação fica em "Minha Saúde" → "Carteira de Vacinação". Ela é montada pelo calendário ' +
            'do PNI a partir da data de nascimento, e o seletor do topo alterna entre você e cada dependente. ' +
            'Cada dose fica em um de três estados: registrada, prevista ou em atraso. Quem confirma a dose é ' +
            'você, no botão "Marcar como aplicada" — o app não é ligado ao sistema do posto. Dose vencida sem ' +
            'registro vira aviso na tela inicial.',
    },
    {
        chaves: ['ubs', 'upa', 'posto de saude', 'posto de saúde', 'rede de saude', 'rede de saúde',
                 'unidade', 'unidades', 'mais perto', 'mais próximo', 'mais proximo', 'onde fico'],
        resposta:
            'Na aba "Rede" da barra inferior você vê as UBS, UPAs e prontos-socorros da sua cidade, do mais perto ' +
            'para o mais longe, com endereço, telefone e horário. A distância sai da sua localização (se você ' +
            'autorizar) ou do CEP do seu cadastro, e o botão "Como chegar" abre a rota no seu app de mapas. ' +
            'Você pode marcar uma unidade como "a minha" e tocar em "O que tem lá" para ver o que o CNES informa ' +
            'sobre ela. Unidades de cidades vizinhas aparecem quando estão a até 12 km — vêm marcadas como tal.',
    },
    {
        chaves: ['quem viu', 'quem acessou', 'historico de acesso', 'histórico de acesso',
                 'auditoria', 'trilha', 'log'],
        resposta:
            'Em "Mais" → "Histórico de acessos" você vê cada vez que um profissional entrou com um código ' +
            'seu: o nome, o CRM, o que ele fez e quando. O filtro "Você" mostra o outro lado — os seus ' +
            'próprios acessos: quando entrou, quando abriu o prontuário, os exames ou as consultas, quando ' +
            'baixou o PDF, quando mexeu nos dependentes ou nos contatos de emergência e quando pediu a ' +
            'recuperação da senha. Se a leitura foi de um dependente, a linha diz o nome dele. O registro ' +
            'é automático e não pode ser apagado.',
    },
    {
        chaves: ['o que e esse exame', 'o que é esse exame', 'o que e este exame',
                 'significa o exame', 'explicar exame', 'explicacao', 'explicação',
                 'nao entendi o exame', 'não entendi o exame', 'para que serve a vacina',
                 'glossario', 'glossário'],
        resposta:
            'Ao lado do nome de cada exame e de cada vacina existe um "?". Tocando nele abre uma ' +
            'explicação em linguagem simples do que aquilo é e por que o profissional costuma pedir ' +
            'ou aplicar. O texto é escrito por inteligência artificial e fala do item em geral: ele ' +
            'não avalia o seu resultado. Só o nome do exame sai do aplicativo — nunca o seu valor.',
    },
    {
        chaves: ['privacidade', 'dados', 'lgpd', 'termo', 'termos'],
        resposta:
            'No menu "Mais" você encontra os "Termos de Utilização" e o "Portal de Privacidade", ' +
            'com tudo sobre como tratamos e protegemos os seus dados (LGPD).',
    },
    {
        chaves: ['faq', 'duvidas frequentes', 'dúvidas frequentes', 'perguntas frequentes', 'ajuda', 'tutorial'],
        resposta:
            'No menu "Mais" existe a tela "Dúvidas frequentes", com as perguntas mais comuns sobre conta, ' +
            'dependentes, exames, vacinação, acesso do médico e privacidade.',
    },
    {
        chaves: ['emergência', 'emergencia', 'urgência', 'urgencia', 'socorro', 'samu', 'dor'],
        resposta:
            '⚠️ Em caso de emergência, ligue imediatamente para o SAMU (192) ou procure o pronto-socorro mais próximo. ' +
            'Este assistente não substitui atendimento médico.',
    },
    {
        chaves: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'eaí', 'eai'],
        resposta: 'Olá! 👋 Posso ajudar com agendamentos, exames, dependentes, prontuário e privacidade. O que você precisa?',
    },
    {
        chaves: ['obrigado', 'obrigada', 'valeu', 'agradeço', 'agradeco'],
        resposta: 'Por nada! 😊 Se precisar de mais alguma coisa, é só chamar.',
    },
];

// Sugestões rápidas exibidas como botões na primeira interação.
const SUGESTOES = ['Como agendar consulta?', 'Ver meus exames', 'Adicionar dependente'];

// Tira acentos e caixa para o casamento não depender de "vacinação" vs "vacinacao".
function normalizar(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Procura na base local e devolve a resposta, ou null se nada casar.
// Vence a entrada com MAIS palavras-chave presentes: antes vencia a primeira que
// casasse, então "resultado do exame de sangue da consulta" caía em consultas.
function buscarNaBase(texto) {
    const t = normalizar(texto);
    let melhor = null;
    let melhorPontos = 0;
    for (const entrada of BASE_CONHECIMENTO) {
        const pontos = entrada.chaves.filter((chave) => t.includes(normalizar(chave))).length;
        if (pontos > melhorPontos) {
            melhorPontos = pontos;
            melhor = entrada;
        }
    }
    return melhor ? melhor.resposta : null;
}

// Exibida quando a base local não sabe e a IA também não respondeu (sem chave
// configurada, cota do dia estourada ou sem internet).
const RESPOSTA_FALLBACK =
    'Ainda não sei responder isso com certeza. 🤔 Posso ajudar com: consultas, exames, ' +
    'dependentes, prontuário, senha/acesso e privacidade. Tente reformular ou escolha um desses temas.';

export default function MedicalChatbot() {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const [messages, setMessages] = useState([
        {
            id: 1,
            text: 'Olá! Sou o assistente do Saúde Conecta. Como posso te ajudar hoje?',
            sender: 'bot',
        },
    ]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isTyping, isOpen]);

    // Esconde no login, no cadastro e no portal do médico (que não é do paciente).
    if (['/', '/cadastro', '/medico'].includes(location.pathname)) return null;

    // Acrescenta uma fala do bot e libera o input.
    const responder = (texto) => {
        setMessages((prev) => [...prev, { id: Date.now() + 1, text: texto, sender: 'bot' }]);
        setIsTyping(false);
    };

    // Duas camadas: a base local responde na hora as dúvidas sobre o app; o que
    // ela não conhece vai para a IA. Se a IA não responder (sem chave, cota do
    // dia estourada ou sem internet), cai no texto de fallback — assim o
    // chatbot nunca fica mudo.
    const enviarTexto = async (texto) => {
        const limpo = texto.trim();
        if (!limpo || isTyping) return;

        setMessages((prev) => [...prev, { id: Date.now(), text: limpo, sender: 'user' }]);
        setInputValue('');
        setIsTyping(true);

        const local = buscarNaBase(limpo);
        if (local) {
            // Pequeno atraso para simular a digitação do assistente.
            setTimeout(() => responder(local), 900);
            return;
        }

        const daIA = await perguntarIA(limpo);
        responder(daIA || RESPOSTA_FALLBACK);
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        enviarTexto(inputValue);
    };

    // As sugestões só aparecem antes de o usuário enviar a primeira mensagem.
    const mostrarSugestoes = messages.length === 1;

    
    return (
        <div className="chatbot-wrapper">
            {/* Chat Window */}
            {isOpen && (
                <div className="chat-window">
                    {/* Header */}
                    <div className="chat-header">
                        <div className="chat-header-info">
                            <div className="chat-bot-icon">
                                <Bot size={20} color="#fff" />
                            </div>
                            <div className="chat-bot-status">
                                <span className="chat-bot-name">Assistente Virtual</span>
                                <div className="chat-status-indicator">
                                    <span className="status-dot"></span>
                                    <span className="status-text">Online</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="chat-close-btn"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Body */}
                    <div className="chat-body">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`chat-message-row ${msg.sender}`}
                            >
                                <div
                                    className={`chat-bubble ${msg.sender}`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="chat-message-row bot">
                                <div className="chat-bubble bot typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}

                        {/* Sugestões rápidas (apenas no início da conversa) */}
                        {mostrarSugestoes && !isTyping && (
                            <div className="chat-suggestions">
                                {SUGESTOES.map((sugestao) => (
                                    <button
                                        key={sugestao}
                                        type="button"
                                        className="chat-suggestion-btn"
                                        onClick={() => enviarTexto(sugestao)}
                                    >
                                        {sugestao}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form
                        onSubmit={handleSendMessage}
                        className="chat-input-area"
                    >
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            className="chat-input"
                            disabled={isTyping}
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim() || isTyping}
                            className="chat-send-btn"
                        >
                            <Send size={18} />
                        </button>
                    </form>

                    {/* O assistente não lê o prontuário, mas o que for digitado
                        aqui pode sair do app para o modelo de IA. Como a caixa
                        é de texto livre, o paciente precisa saber disso antes
                        de escrever um sintoma ou um número de documento. */}
                    <p className="chat-aviso-privacidade">
                        Não escreva dados pessoais. O assistente não vê o seu prontuário.
                    </p>
                </div>
            )}

            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="chatbot-fab"
            >
                {isOpen ? <X size={26} /> : <MessageCircle size={26} />}
            </button>
        </div>
    );
}