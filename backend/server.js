// backend/server.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const ConversationalBot = require('./ConversationalBot');

const app = express();
const port = 5000;

// Middleware
app.use(bodyParser.json());

// Configurar o CORS para permitir credenciais e especificar a origem
app.use(cors({
  origin: 'http://localhost:3000', // Substitua pela URL do seu frontend
  credentials: true
}));

// Configurar o middleware de sessão
app.use(session({
  secret: 'sua-chave-secreta', // Substitua por uma chave secreta segura
  resave: false,
  saveUninitialized: true
}));

// Inicializar o banco de dados SQLite
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
  }
});

// Criar as tabelas se não existirem
db.serialize(() => {
  // Tabela de intents
  db.run(`
    CREATE TABLE IF NOT EXISTS intents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      intent TEXT NOT NULL,
      utterance TEXT NOT NULL,
      answer TEXT
    )
  `);

  // Tabela de entidades
  db.run(`
    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      value TEXT NOT NULL
    )
  `);

  // Tabela de slots
  db.run(`
    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      intent_name TEXT NOT NULL,
      slot TEXT NOT NULL,
      question TEXT NOT NULL,
      fallback TEXT,
      entity TEXT,
      jump_to TEXT,
      condition TEXT,
      call_api TEXT,
      function TEXT
    )
  `);
});

const loadEntities = () => {
  return new Promise((resolve, reject) => {
      db.all('SELECT * FROM entities', [], (err, rows) => {
          if (err) {
              return reject(err);
          }

          const entities = rows.map(row => {
              let value = row.value;

              if (row.type === 'enum') {
                  value = JSON.parse(row.value);
              } else if (row.type === 'regex') {
                  // Remover aspas simples se existirem
                  if (value.startsWith("'") && value.endsWith("'")) {
                      value = value.slice(1, -1);
                  }

                  // Desescapar barras invertidas duplas
                  value = value.replace(/\\\\/g, '\\');
              }

              return {
                  name: row.name,
                  type: row.type,
                  value: value
              };
          });
          resolve(entities);
      });
  });
};





// Função para carregar documentos (intents e utterances) do banco de dados
const loadDocuments = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT intent, GROUP_CONCAT(utterance) as utterances FROM intents GROUP BY intent', [], (err, rows) => {
      if (err) {
        return reject(err);
      }

      const documents = rows.map(row => {
        return {
          intent: row.intent,
          text: row.utterances.split(',')
        };
      });
      resolve(documents);
    });
  });
};

// Função para carregar slots do banco de dados
const loadSlots = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM slots', [], (err, rows) => {
      if (err) {
        return reject(err);
      }

      // Agrupar slots por intent_name
      const slotsByIntent = {};
      rows.forEach(row => {
        if (!slotsByIntent[row.intent_name]) {
          slotsByIntent[row.intent_name] = [];
        }
        slotsByIntent[row.intent_name].push({
          slot: row.slot,
          question: row.question,
          fallback: row.fallback,
          entity: row.entity,
          jumpTo: row.jump_to,
          condition: row.condition,
          callApi: row.call_api ? JSON.parse(row.call_api) : null,
          function: row.function ? JSON.parse(row.function) : null
        });
      });

      // Montar o array de intents com slots
      const intents = Object.keys(slotsByIntent).map(intentName => {
        return {
          name: intentName,
          questions: slotsByIntent[intentName]
        };
      });

      resolve(intents);
    });
  });
};

// Inicializar o ConversationalBot
const bot = new ConversationalBot();

// Função para carregar os dados e inicializar o bot
const initializeBot = async () => {
  try {
    const entities = await loadEntities();
    const documents = await loadDocuments();
    const intents = await loadSlots();

    bot.addEntities(entities);
    bot.addIntents(documents);
    bot.addSlots(intents);

    await bot.train();
    console.log('Bot inicializado com dados do banco de dados.');
  } catch (error) {
    console.error('Erro ao inicializar o bot:', error);
  }
};

// Chamar initializeBot para configurar o bot
initializeBot();

// Criar endpoints para gerenciar intents, entidades e slots

// INTENTS

// Listar todas as intents
app.get('/api/intents', (req, res) => {
  db.all('SELECT * FROM intents', [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar intents:', err.message);
      return res.status(500).json({ message: 'Erro ao buscar intents.' });
    }
    res.json(rows);
  });
});

// Adicionar uma nova intent
app.post('/api/intents', (req, res) => {
  const { intent, utterance, answer } = req.body;

  if (!intent || !utterance) {
    return res.status(400).json({ message: 'Intent e utterance são obrigatórios.' });
  }

  const sql = 'INSERT INTO intents (intent, utterance, answer) VALUES (?, ?, ?)';
  const params = [intent, utterance, answer || ''];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Erro ao inserir intent:', err.message);
      return res.status(500).json({ message: 'Erro ao inserir intent.' });
    }

    res.status(201).json({ id: this.lastID, intent, utterance, answer });
  });
});

// Atualizar uma intent
app.put('/api/intents/:id', (req, res) => {
  const { id } = req.params;
  const { intent, utterance, answer } = req.body;

  if (!intent || !utterance) {
    return res.status(400).json({ message: 'Intent e utterance são obrigatórios.' });
  }

  const sql = 'UPDATE intents SET intent = ?, utterance = ?, answer = ? WHERE id = ?';
  const params = [intent, utterance, answer || '', id];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Erro ao atualizar intent:', err.message);
      return res.status(500).json({ message: 'Erro ao atualizar intent.' });
    }

    res.json({ id, intent, utterance, answer });
  });
});

// Deletar uma intent
app.delete('/api/intents/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM intents WHERE id = ?';
  db.run(sql, [id], function (err) {
    if (err) {
      console.error('Erro ao deletar intent:', err.message);
      return res.status(500).json({ message: 'Erro ao deletar intent.' });
    }

    res.json({ message: 'Intent deletada com sucesso.' });
  });
});

// ENTITIES

// Listar todas as entidades
app.get('/api/entities', (req, res) => {
  db.all('SELECT * FROM entities', [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar entidades:', err.message);
      return res.status(500).json({ message: 'Erro ao buscar entidades.' });
    }
    res.json(rows);
  });
});

// Adicionar uma nova entidade
app.post('/api/entities', (req, res) => {
  const { name, type, value } = req.body;

  const processedValue = type === 'enum' ? JSON.stringify(value) : value;

  db.run(`INSERT INTO entities (name, type, value) VALUES (?, ?, ?)`,
      [name, type, processedValue],
      function(err) {
          if (err) {
              return res.status(500).json({ error: 'Erro ao criar a entidade.' });
          }
          res.json({ id: this.lastID });
      });
});


// Atualizar uma entidade
app.put('/api/entities/:id', (req, res) => {
  const { name, type, value } = req.body;
  const { id } = req.params;

  const processedValue = type === 'enum' ? JSON.stringify(value) : value;

  db.run(`UPDATE entities SET name = ?, type = ?, value = ? WHERE id = ?`,
      [name, type, processedValue, id],
      function(err) {
          if (err) {
              return res.status(500).json({ error: 'Erro ao atualizar a entidade.' });
          }
          res.json({ message: 'Entidade atualizada com sucesso.' });
      });
});


// Deletar uma entidade
app.delete('/api/entities/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM entities WHERE id = ?';
  db.run(sql, [id], function (err) {
    if (err) {
      console.error('Erro ao deletar entidade:', err.message);
      return res.status(500).json({ message: 'Erro ao deletar entidade.' });
    }

    res.json({ message: 'Entidade deletada com sucesso.' });
  });
});

// SLOTS

// Listar todos os slots
app.get('/api/slots', (req, res) => {
  db.all('SELECT * FROM slots', [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar slots:', err.message);
      return res.status(500).json({ message: 'Erro ao buscar slots.' });
    }
    res.json(rows);
  });
});

// Adicionar um novo slot
app.post('/api/slots', (req, res) => {
  const { intent_name, slot, question, fallback, entity, jump_to, condition, call_api, func } = req.body;

  if (!intent_name || !slot || !question) {
    return res.status(400).json({ message: 'Intent, slot e question são obrigatórios.' });
  }

  const sql = 'INSERT INTO slots (intent_name, slot, question, fallback, entity, jump_to, condition, call_api, function) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  const params = [
    intent_name,
    slot,
    question,
    fallback || '',
    entity || '',
    jump_to || '',
    condition || '',
    call_api ? JSON.stringify(call_api) : '',
    func ? JSON.stringify(func) : ''
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Erro ao inserir slot:', err.message);
      return res.status(500).json({ message: 'Erro ao inserir slot.' });
    }

    res.status(201).json({ id: this.lastID, intent_name, slot, question, fallback, entity, jump_to, condition, call_api, function: func });
  });
});

// Atualizar um slot
app.put('/api/slots/:id', (req, res) => {
  const { id } = req.params;
  const { intent_name, slot, question, fallback, entity, jump_to, condition, call_api, func } = req.body;

  if (!intent_name || !slot || !question) {
    return res.status(400).json({ message: 'Intent, slot e question são obrigatórios.' });
  }

  const sql = 'UPDATE slots SET intent_name = ?, slot = ?, question = ?, fallback = ?, entity = ?, jump_to = ?, condition = ?, call_api = ?, function = ? WHERE id = ?';
  const params = [
    intent_name,
    slot,
    question,
    fallback || '',
    entity || '',
    jump_to || '',
    condition || '',
    call_api ? JSON.stringify(call_api) : '',
    func ? JSON.stringify(func) : '',
    id
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Erro ao atualizar slot:', err.message);
      return res.status(500).json({ message: 'Erro ao atualizar slot.' });
    }

    res.json({ id, intent_name, slot, question, fallback, entity, jump_to, condition, call_api, function: func });
  });
});

// Deletar um slot
app.delete('/api/slots/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM slots WHERE id = ?';
  db.run(sql, [id], function (err) {
    if (err) {
      console.error('Erro ao deletar slot:', err.message);
      return res.status(500).json({ message: 'Erro ao deletar slot.' });
    }

    res.json({ message: 'Slot deletado com sucesso.' });
  });
});

// Endpoint para treinar o modelo manualmente
app.post('/api/train', (req, res) => {
  initializeBot().then(() => {
    res.json({ message: 'Modelo treinado com sucesso.' });
  }).catch(err => {
    console.error('Erro ao treinar o modelo:', err);
    res.status(500).json({ message: 'Erro ao treinar o modelo.' });
  });
});

// Endpoint para processar mensagens de chat
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Mensagem é obrigatória.' });
  }

  // Obter o contexto da sessão do usuário
  let context = req.session.context || { slots: {} };

  try {
    const result = await bot.processInput(message, context);

    // Atualizar o contexto da sessão
    req.session.context = result.context || context;

    // Enviar a resposta ao cliente
    res.json({
      answer: result.question,
      context: req.session.context
    });
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    res.status(500).json({ message: 'Erro ao processar mensagem.' });
  }
});

// ... importações e código existente

// Endpoint para resetar o contexto da conversa
app.post('/api/reset-context', (req, res) => {
  req.session.context = { slots: {} };
  res.json({ message: 'Contexto da conversa foi resetado com sucesso.' });
});

// ... código existente


// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor backend rodando em http://localhost:${port}`);
});
