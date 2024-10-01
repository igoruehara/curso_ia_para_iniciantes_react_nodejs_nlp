// frontend/src/components/SlotManager.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SlotManager.css';

const SlotManager = () => {
  const [slots, setSlots] = useState([]);
  const [intents, setIntents] = useState([]);
  const [form, setForm] = useState({
    id: null,
    intent_name: '',
    slot: '',
    question: '',
    fallback: '',
    entity: '',
    jump_to: '',
    condition: '',
    call_api: '',
    func: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  // Função para carregar os slots do backend
  const fetchSlots = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/slots', { withCredentials: true });
      setSlots(response.data);
    } catch (error) {
      console.error('Erro ao buscar slots:', error);
    }
  };

  // Função para carregar as intents
  const fetchIntents = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/intents', { withCredentials: true });
      const uniqueIntents = [...new Set(response.data.map(item => item.intent))];
      setIntents(uniqueIntents);
    } catch (error) {
      console.error('Erro ao buscar intents:', error);
    }
  };

  useEffect(() => {
    fetchSlots();
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

    const { id, intent_name, slot, question, fallback, entity, jump_to, condition, call_api, func } = form;

    if (!intent_name || !slot || !question) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }

    let parsedCallApi, parsedFunction;
    try {
      parsedCallApi = call_api ? JSON.parse(call_api) : null;
      parsedFunction = func ? JSON.parse(func) : null;
    } catch (error) {
      alert('call_api e function devem ser JSON válidos.');
      return;
    }

    try {
      if (isEditing) {
        // Editar slot existente
        await axios.put(`http://localhost:5000/api/slots/${id}`, {
          intent_name,
          slot,
          question,
          fallback,
          entity,
          jump_to,
          condition,
          call_api: parsedCallApi,
          func: parsedFunction,
        }, { withCredentials: true });
        alert('Slot atualizado com sucesso.');
      } else {
        // Adicionar novo slot
        await axios.post('http://localhost:5000/api/slots', {
          intent_name,
          slot,
          question,
          fallback,
          entity,
          jump_to,
          condition,
          call_api: parsedCallApi,
          func: parsedFunction,
        }, { withCredentials: true });
        alert('Slot adicionado com sucesso.');
      }

      // Limpar o formulário e recarregar os slots
      setForm({
        id: null,
        intent_name: '',
        slot: '',
        question: '',
        fallback: '',
        entity: '',
        jump_to: '',
        condition: '',
        call_api: '',
        func: '',
      });
      setIsEditing(false);
      fetchSlots();
    } catch (error) {
      console.error('Erro ao salvar slot:', error);
      alert('Ocorreu um erro ao salvar o slot.');
    }
  };

  // Editar um slot
  const handleEdit = (slotData) => {
    setForm({
      id: slotData.id,
      intent_name: slotData.intent_name,
      slot: slotData.slot,
      question: slotData.question,
      fallback: slotData.fallback,
      entity: slotData.entity,
      jump_to: slotData.jump_to,
      condition: slotData.condition,
      call_api: slotData.call_api ? JSON.stringify(JSON.parse(slotData.call_api), null, 2) : '',
      func: slotData.function ? JSON.stringify(JSON.parse(slotData.function), null, 2) : '',
    });
    setIsEditing(true);
  };

  // Deletar um slot
  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este slot?')) {
      try {
        await axios.delete(`http://localhost:5000/api/slots/${id}`, { withCredentials: true });
        alert('Slot deletado com sucesso.');
        fetchSlots();
      } catch (error) {
        console.error('Erro ao deletar slot:', error);
        alert('Ocorreu um erro ao deletar o slot.');
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
    <div className="slot-manager-container">
      <h2>Gerenciador de Slots</h2>
      <button onClick={handleTrain}>Treinar Modelo</button>
      <form onSubmit={handleFormSubmit} className="slot-form">
        <h3>{isEditing ? 'Editar Slot' : 'Adicionar Novo Slot'}</h3>
        <select name="intent_name" value={form.intent_name} onChange={handleFormChange} required>
          <option value="">Selecione a Intent</option>
          {intents.map((intent, index) => (
            <option key={index} value={intent}>{intent}</option>
          ))}
        </select>
        <input
          type="text"
          name="slot"
          value={form.slot}
          onChange={handleFormChange}
          placeholder="Nome do Slot"
          required
        />
        <input
          type="text"
          name="question"
          value={form.question}
          onChange={handleFormChange}
          placeholder="Pergunta"
          required
        />
        <input
          type="text"
          name="fallback"
          value={form.fallback}
          onChange={handleFormChange}
          placeholder="Fallback"
        />
        <input
          type="text"
          name="entity"
          value={form.entity}
          onChange={handleFormChange}
          placeholder="Entidade"
        />
        <input
          type="text"
          name="jump_to"
          value={form.jump_to}
          onChange={handleFormChange}
          placeholder="Jump To"
        />
        <input
          type="text"
          name="condition"
          value={form.condition}
          onChange={handleFormChange}
          placeholder="Condição"
        />
        <textarea
          name="call_api"
          value={form.call_api}
          onChange={handleFormChange}
          placeholder='Call API (JSON)'
        />
        <textarea
          name="func"
          value={form.func}
          onChange={handleFormChange}
          placeholder='Function (JSON)'
        />
        <button type="submit">{isEditing ? 'Atualizar Slot' : 'Adicionar Slot'}</button>
        {isEditing && <button type="button" onClick={() => { setIsEditing(false); setForm({ id: null, intent_name: '', slot: '', question: '', fallback: '', entity: '', jump_to: '', condition: '', call_api: '', func: '' }); }}>Cancelar</button>}
      </form>

      <table className="slot-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Intent</th>
            <th>Slot</th>
            <th>Pergunta</th>
            <th>Fallback</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.intent_name}</td>
              <td>{item.slot}</td>
              <td>{item.question}</td>
              <td>{item.fallback}</td>
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

export default SlotManager;
