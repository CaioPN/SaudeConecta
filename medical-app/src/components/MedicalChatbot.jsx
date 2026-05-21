import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { useLocation } from 'react-router-dom';

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

    

    const mockResponses = [
        "Entendi. Pode me dar mais detalhes sobre isso?",
        "Certo, vou registrar essa informação no seu prontuário.",
        "Um dos nossos especialistas irá avaliar e entrará em contato.",
        "Recomendo que você agende uma consulta pelo menu principal para avaliarmos melhor.",
        "Isso é um procedimento padrão. Posso ajudar com mais alguma dúvida?"
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isTyping, isOpen]);

    if (location.pathname === '/') return null; // Hide on login screen

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const newUserMessage = {
            id: Date.now(),
            text: inputValue,
            sender: 'user',
        };

        setMessages((prev) => [...prev, newUserMessage]);
        setInputValue('');
        setIsTyping(true);

        // Mock typing delay and bot response
        setTimeout(() => {
            const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
            const newBotMessage = {
                id: Date.now() + 1,
                text: randomResponse,
                sender: 'bot',
            };
            setMessages((prev) => [...prev, newBotMessage]);
            setIsTyping(false);
        }, 1500);
    };

    
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