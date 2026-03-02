const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

// Routes
app.get('/api/customers', (req, res) => {
    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send({ error: 'Erro ao ler banco de dados' });
        res.send(JSON.parse(data));
    });
});

app.post('/api/customers', (req, res) => {
    const customers = req.body;
    fs.writeFile(DB_FILE, JSON.stringify(customers, null, 2), (err) => {
        if (err) return res.status(500).send({ error: 'Erro ao salvar dados' });
        res.send({ message: 'Dados salvos com sucesso!' });
    });
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`   PAINEL GERENCIAR AMOR - CAROL GERENTE DE VENDAS   `);
    console.log(`====================================================`);
    console.log(`   SERVIDOR RODANDO EM: http://localhost:${PORT}      `);
    console.log(`   Pressione Ctrl+C para parar o servidor.           `);
    console.log(`====================================================`);
});
