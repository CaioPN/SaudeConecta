import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { useLocation } from 'react-router-dom';

// Base de conhecimento do assistente: cada item tem palavras-chave e uma resposta.
// O primeiro item cujas palavras-chave aparecerem na mensagem é usado como resposta.
const BASE_CONHECIMENTO = [
    {
        chaves: ['agendar', 'agendamento', 'consulta', 'marcar', 'médico', 'medico'],
        resposta:
            'Para agendar uma consulta, abra o menu "Início" e toque em "Agendamentos" nas Ações Rápidas. ' +
            'Lá você escolhe a data e o profissional disponível.',
    },
    {
        chaves: ['exame', 'exames', 'resultado', 'sangue', 'hemograma', 'imagem', 'laudo'],
        resposta:
            'Seus exames ficam em "Exames/Registros" → "Exames". Você pode ver os resultados de sangue e de imagem, ' +
            'e ainda baixar um relatório em PDF com todo o histórico pelo botão "Baixar PDF".',
    },
    {
        chaves: ['dependente', 'dependentes', 'familiar', 'filho', 'filha', 'família', 'familia'],
        resposta:
            'Você gerencia dependentes em "Exames/Registros" → "Dependentes". Lá é possível adicionar, listar ' +
            'e remover familiares vinculados à sua conta.',
    },
    {
        chaves: ['prontuário', 'prontuario', 'histórico', 'historico', 'alergia', 'condição', 'condicao'],
        resposta:
            'No seu prontuário ("Dados da Consulta") você encontra alergias, condições de saúde e os registros ' +
            'recentes das suas consultas.',
    },
    {
        chaves: ['senha', 'login', 'entrar', 'esqueci', 'acesso', 'biometria'],
        resposta:
            'Problemas de acesso? Na tela de login use "Esqueceu a senha?" para redefini-la. ' +
            'Por segurança, sua senha precisa ter ao menos 8 caracteres, com maiúscula, minúscula, número e símbolo.',
    },
    {
        chaves: ['vacina', 'vacinação', 'vacinacao', 'imunização', 'imunizacao'],
        resposta:
            'A sua Carteira de Vacinação fica no "Meu perfil", com o registro das imunizações.',
    },
    {
        chaves: ['privacidade', 'dados', 'lgpd', 'termo', 'termos'],
        resposta:
            'No menu "Mais" você encontra os "Termos de Utilização" e o "Portal de Privacidade", ' +
            'com tudo sobre como tratamos e protegemos os seus dados (LGPD).',
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

// Encontra a melhor resposta com base nas palavras-chave da mensagem do usuário.
function gerarResposta(texto) {
    const t = texto.toLowerCase();
    const item = BASE_CONHECIMENTO.find((entrada) =>
        entrada.chaves.some((chave) => t.includes(chave))
    );
    if (item) return item.resposta;
    return (
        'Ainda não sei responder isso com certeza. 🤔 Posso ajudar com: agendar consultas, exames, ' +
        'dependentes, prontuário, senha/acesso e privacidade. Tente reformular ou escolha um desses temas.'
    );
}

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

    if (location.pathname === '/' || location.pathname === '/cadastro') return null; // Hide on login and registration screens

    // Processa um texto (vindo do input ou de uma sugestão) e gera a resposta do bot.
    const enviarTexto = (texto) => {
        const limpo = texto.trim();
        if (!limpo || isTyping) return;

        const newUserMessage = {
            id: Date.now(),
            text: limpo,
            sender: 'user',
        };

        setMessages((prev) => [...prev, newUserMessage]);
        setInputValue('');
        setIsTyping(true);

        // Pequeno atraso para simular a digitação do assistente.
        setTimeout(() => {
            const newBotMessage = {
                id: Date.now() + 1,
                text: gerarResposta(limpo),
                sender: 'bot',
            };
            setMessages((prev) => [...prev, newBotMessage]);
            setIsTyping(false);
        }, 900);
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