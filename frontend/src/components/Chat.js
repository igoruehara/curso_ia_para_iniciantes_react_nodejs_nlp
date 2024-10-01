import React, { useState } from 'react';
import axios from 'axios';
import './Chat.css';

const Chat = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);

  // Função para resetar o contexto da conversa
  const handleResetContext = async () => {
    try {
      const response = await axios.post(
        'http://localhost:5000/api/reset-context',
        {},
        { withCredentials: true }
      );
      alert(response.data.message);
      // Opcionalmente, limpe as mensagens do chat
      setMessages([]);
    } catch (error) {
      console.error('Erro ao resetar o contexto:', error);
      alert('Ocorreu um erro ao resetar o contexto.');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages([...messages, userMessage]);

    if (input.trim() === '/reset') {
      // Se o usuário digitar '/reset', reseta o contexto
      await handleResetContext();
      setInput('');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:5000/api/chat',
        { message: input },
        { withCredentials: true }
      );

      const botText = response.data.answer;

      const botMessage = {
        sender: 'bot',
        text: botText,
      };

      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      const botMessage = { sender: 'bot', text: 'Desculpe, ocorreu um erro ao processar sua mensagem.' };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    }

    setInput('');
  };

  return (
    <div className="chat-container">
      <h2>Chatbot</h2>
      <button onClick={handleResetContext} className="reset-button">
        Resetar Contexto
      </button>
      <div className="chat-box">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.sender === 'bot' ? 'bot' : 'user'}`}
          >
            <p>{msg.text}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="chat-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua mensagem..."
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
};

export default Chat;
