// frontend/src/components/EntityManager.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EntityManager.css';

const EntityManager = () => {
  const [entities, setEntities] = useState([]);
  const [form, setForm] = useState({
    id: null,
    name: '',
    type: '',
    value: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  // Função para carregar as entidades do backend
  const fetchEntities = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/entities', { withCredentials: true });
      setEntities(response.data);
    } catch (error) {
      console.error('Erro ao buscar entidades:', error);
    }
  };

  useEffect(() => {
    fetchEntities();
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

    const { id, name, type, value } = form;

    if (!name || !type || !value) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    let processedValue;
try {
    if (type === 'enum') {
        // Para enum, o valor deve ser um JSON válido (array ou objeto)
        processedValue = JSON.parse(value);
    } else if (type === 'regex') {
        // Para regex, o valor é uma string (expressão regular)
        processedValue = value;
    } else {
        alert('Tipo de entidade inválido.');
        return;
    }
} catch (error) {
    alert('Valor inválido. Para entidades do tipo "enum", o valor deve ser um JSON válido.');
    return;
}


    try {
      if (isEditing) {
        // Editar entidade existente
        await axios.put(`http://localhost:5000/api/entities/${id}`, {
          name,
          type,
          value: processedValue,
        }, { withCredentials: true });
        alert('Entidade atualizada com sucesso.');
      } else {
        // Adicionar nova entidade
        await axios.post('http://localhost:5000/api/entities', {
          name,
          type,
          value: processedValue,
        }, { withCredentials: true });
        alert('Entidade adicionada com sucesso.');
      }

      // Limpar o formulário e recarregar as entidades
      setForm({ id: null, name: '', type: '', value: '' });
      setIsEditing(false);
      fetchEntities();
    } catch (error) {
      console.error('Erro ao salvar entidade:', error);
      alert('Ocorreu um erro ao salvar a entidade.');
    }
  };

  // Editar uma entidade
  const handleEdit = (entityData) => {
    setForm({
      id: entityData.id,
      name: entityData.name,
      type: entityData.type,
      value: entityData.type === 'enum'
        ? JSON.stringify(JSON.parse(entityData.value), null, 2)
        : entityData.value,
    });
    setIsEditing(true);
  };

  // Deletar uma entidade
  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta entidade?')) {
      try {
        await axios.delete(`http://localhost:5000/api/entities/${id}`, { withCredentials: true });
        alert('Entidade deletada com sucesso.');
        fetchEntities();
      } catch (error) {
        console.error('Erro ao deletar entidade:', error);
        alert('Ocorreu um erro ao deletar a entidade.');
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
    <div className="entity-manager-container">
      <h2>Gerenciador de Entidades</h2>
      <button onClick={handleTrain}>Treinar Modelo</button>
      <form onSubmit={handleFormSubmit} className="entity-form">
        <h3>{isEditing ? 'Editar Entidade' : 'Adicionar Nova Entidade'}</h3>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleFormChange}
          placeholder="Nome da Entidade"
          required
        />
        <select name="type" value={form.type} onChange={handleFormChange} required>
          <option value="">Selecione o Tipo</option>
          <option value="regex">Regex</option>
          <option value="enum">Enum</option>
        </select>
        <textarea
          name="value"
          value={form.value}
          onChange={handleFormChange}
          placeholder='Valor (para "regex", insira a expressão regular; para "enum", insira um JSON como ["opção1", "opção2"])'
          required
        />
        <button type="submit">{isEditing ? 'Atualizar Entidade' : 'Adicionar Entidade'}</button>
        {isEditing && <button type="button" onClick={() => { setIsEditing(false); setForm({ id: null, name: '', type: '', value: '' }); }}>Cancelar</button>}
      </form>

      <table className="entity-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Valor</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {entities.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>{item.type}</td>
              <td>
                <pre>
                  {item.type === 'enum'
                    ? JSON.stringify(JSON.parse(item.value), null, 2)
                    : item.value}
                </pre>
              </td>
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

export default EntityManager;
