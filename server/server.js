// server.js
import express from 'express';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(express.json());

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'tu_password',
  port: process.env.DB_PORT || 5432,
});

// 1. Obtener todos los proyectos con info del creador y monto
app.get('/projects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.title, 
        p.description, 
        p.goal_amount, 
        p.current_amount, 
        p.category, 
        p.deadline, 
        u.wallet_address AS creator_wallet
      FROM projects p
      JOIN users u ON p.creator_id = u.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Crear un nuevo proyecto
app.post('/projects', async (req, res) => {
  const { creator_id, title, description, goal_amount, category, deadline } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO projects (creator_id, title, description, goal_amount, category, deadline)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [creator_id, title, description, goal_amount, category, deadline]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Registrar donación y actualizar monto
app.post('/donations', async (req, res) => {
  const { donor_id, project_id, amount, tx_signature } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insertar donación
    const donationResult = await client.query(`
      INSERT INTO donations (donor_id, project_id, amount, tx_signature)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [donor_id, project_id, amount, tx_signature]);

    // Actualizar monto actual
    await client.query(`
      UPDATE projects
      SET current_amount = current_amount + $1
      WHERE id = $2;
    `, [amount, project_id]);

    await client.query('COMMIT');
    res.status(201).json(donationResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 4. Listar donaciones de un proyecto
app.get('/projects/:id/donations', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT d.id, d.amount, d.tx_signature, d.donated_at, u.wallet_address AS donor_wallet
      FROM donations d
      JOIN users u ON d.donor_id = u.id
      WHERE d.project_id = $1
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('API running on port 3000');
});
