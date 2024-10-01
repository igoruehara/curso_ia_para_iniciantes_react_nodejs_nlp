import React, { useState } from 'react';
import axios from 'axios';
import './AddIntent.css';

const AddIntent = () => {
  const [intent, setIntent] = useState('');
  const [utterance, setUtterance] = useState('');
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!intent || !utterance || !answer) {
      setMessage('Por favor, preencha todos os campos.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/intents', {
        intent,
        utterance,
        answer,
      });
      setMessage('Intent cadastrada com sucesso!');
      setIntent('');
      setUtterance('');
      setAnswer('');
    } catch (error) {
      console.error('Erro ao cadastrar intent:', error);
      setMessage('Erro ao cadastrar intent.');
    }
  };

  return (
    <div className="add-intent-container">
      <h2>Cadastrar Nova Intent</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Intent:</label>
          <input
            type="text"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="Ex: saudacao"
            required
          />
        </div>
        <div className="form-group">
          <label>Utterance (Frase de Exemplo):</label>
          <input
            type="text"
            value={utterance}
            onChange={(e) => setUtterance(e.target.value)}
            placeholder="Ex: Olá, tudo bem?"
            required
          />
        </div>
        <div className="form-group">
          <label>Resposta:</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Ex: Olá! Tudo ótimo, e você?"
            rows="4"
            required
          ></textarea>
        </div>
        <button type="submit">Cadastrar Intent</button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default AddIntent;
