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
        chaves: ['dependente', 'dependentes', 'familiar', 'filho', 'filha', 'família', 'familia'],
        resposta:
            'Você gerencia dependentes em "Minha Saúde" → "Dependentes". Lá é possível adicionar, listar ' +
            'e remover familiares vinculados à sua conta.',
    },
    {
        chaves: ['prontuário', 'prontuario', 'histórico', 'historico', 'alergia', 'condição', 'condicao'],
        resposta:
            'No seu prontuário ("Minha Saúde" → "Prontuário") você encontra alergias, condições de saúde e os registros ' +
            'recentes das suas consultas.',
    },
    {
        chaves: ['senha', 'login', 'entrar', 'esqueci', 'acesso', 'biometria'],
        resposta:
            'Sua senha precisa ter ao menos 8 caracteres, com maiúscula, minúscula, número e caractere especial. ' +
            'A redefinição pelo app ainda está em desenvolvimento: se esqueceu a senha, escreva para suporte@saudeconecta.com.br.',
    },
    {
        chaves: ['vacina', 'vacinação', 'vacinacao', 'imunização', 'imunizacao'],
        resposta:
            'A Carteira de Vacinação fica em "Minha Saúde" → "Carteira de Vacinação". Ela é montada pelo calendário ' +
            'do PNI a partir da data de nascimento, e o seletor do topo alterna entre você e cada dependente.',
    },
    {
        chaves: ['ubs', 'upa', 'posto de saude', 'posto de saúde', 'rede de saude', 'rede de saúde',
                 'unidade', 'unidades', 'mais perto', 'mais próximo', 'mais proximo', 'onde fico'],
        resposta:
            'Na aba "Rede" da barra inferior você vê as UBS, UPAs e prontos-socorros da sua cidade, do mais perto ' +
            'para o mais longe, com endereço, telefone e horário. A distância sai da sua localização (se você ' +
            'autorizar) ou do CEP do seu cadastro, e o botão "Como chegar" abre a rota no seu app de mapas.',
    },
    {
        chaves: ['quem viu', 'quem acessou', 'historico de acesso', 'histórico de acesso',
                 'auditoria', 'trilha', 'log'],
        resposta:
            'Em "Mais" → "Histórico de acessos" você vê cada vez que um profissional entrou com um código ' +
            'seu: o nome, o CRM, o que ele fez e quando. O registro é automático e não pode ser apagado.',
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
    'Ainda não sei responder isso com certeza. 🤔 Posso ajudar com: agendar consultas, exames, ' +
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