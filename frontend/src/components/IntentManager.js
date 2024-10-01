// frontend/src/components/IntentManager.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './IntentManager.css';

const IntentManager = () => {
  const [intents, setIntents] = useState([]);
  const [form, setForm] = useState({
    id: null,
    intent: '',
    utterance: '',
    answer: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  // Função para carregar as intents do backend
  const fetchIntents = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/intents', { withCredentials: true });
      setIntents(response.data);
    } catch (error) {
      console.error('Erro ao buscar intents:', error);
    }
  };

  useEffect(() => {
    fetchIntents();
  }, []);

  // Atualizar o estado do formulário
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  // Submeter o formulário
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const { id, intent, utterance, answer } = form;

    if (!intent || !utterance) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }

    try {
      if (isEditing) {
        // Editar intent existente
        await axios.put(`http://localhost:5000/api/intents/${id}`, {
          intent,
          utterance,
          answer,
        }, { withCredentials: true });
        alert('Intent atualizada com sucesso.');
      } else {
        // Adicionar nova intent
        await axios.post('http://localhost:5000/api/intents', {
          intent,
          utterance,
          answer,
        }, { withCredentials: true });
        alert('Intent adicionada com sucesso.');
      }

      // Limpar o formulário e recarregar as intents
      setForm({ id: null, intent: '', utterance: '', answer: '' });
      setIsEditing(false);
      fetchIntents();
    } catch (error) {
      console.error('Erro ao salvar intent:', error);
      alert('Ocorreu um erro ao salvar a intent.');
    }
  };

  // Editar uma intent
  const handleEdit = (intentData) => {
    setForm({
      id: intentData.id,
      intent: intentData.intent,
      utterance: intentData.utterance,
      answer: intentData.answer,
    });
    setIsEditing(true);
  };

  // Deletar uma intent
  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta intent?')) {
      try {
        await axios.delete(`http://localhost:5000/api/intents/${id}`, { withCredentials: true });
        alert('Intent deletada com sucesso.');
        fetchIntents();
      } catch (error) {
        console.error('Erro ao deletar intent:', error);
        alert('Ocorreu um erro ao deletar a intent.');
      }
    }
  };

  // Treinar o modelo
  const handleTrain = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/train', {}, { withCredentials: true });
      alert(response.data.message);
    } catch (error) {
      console.error('Erro ao treinar o modelo:', error);
      alert('Ocorreu um erro ao treinar o modelo.');
    }
  };

  return (
    <div className="intent-manager-container">
      <h2>Gerenciador de Intents</h2>
      <button onClick={handleTrain}>Treinar Modelo</button>
      <form onSubmit={handleFormSubmit} className="intent-form">
        <h3>{isEditing ? 'Editar Intent' : 'Adicionar Nova Intent'}</h3>
        <input
          type="text"
          name="intent"
          value={form.intent}
          onChange={handleFormChange}
          placeholder="Nome da Intent"
          required
        />
        <input
          type="text"
          name="utterance"
          value={form.utterance}
          onChange={handleFormChange}
          placeholder="Utterance"
          required
        />
        <input
          type="text"
          name="answer"
          value={form.answer}
          onChange={handleFormChange}
          placeholder="Resposta (opcional)"
        />
        <button type="submit">{isEditing ? 'Atualizar Intent' : 'Adicionar Intent'}</button>
        {isEditing && <button type="button" onClick={() => { setIsEditing(false); setForm({ id: null, intent: '', utterance: '', answer: '' }); }}>Cancelar</button>}
      </form>

      <table className="intent-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Intent</th>
            <th>Utterance</th>
            <th>Resposta</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {intents.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.intent}</td>
              <td>{item.utterance}</td>
              <td>{item.answer}</td>
              <td>
                <button onClick={() => handleEdit(item)}>Editar</button>
                <button onClick={() => handleDelete(item.id)}>Deletar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default IntentManager;
