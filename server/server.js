// server.js
import express from 'express'
import pkg from 'pg'
import dotenv from 'dotenv'
import cors from 'cors'

dotenv.config()
const { Pool } = pkg

const app = express()

// Middlewares
app.use(cors({
  origin: 'http://localhost:5173', // o '*' si quieres permitir todos
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}))
app.use(express.json())

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  port: process.env.DB_PORT || 5432,
})

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
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Endpoint para obtener estadísticas calculadas
app.get('/stats', async (req, res) => {
  try {
    console.log('Stats endpoint called')
    
    // Obtener estadísticas simples primero
    const totalRaisedResult = await pool.query('SELECT COALESCE(SUM(current_amount), 0) as total_raised FROM projects')
    const totalProjectsResult = await pool.query('SELECT COUNT(*) as total_projects FROM projects')
    const activeProjectsResult = await pool.query('SELECT COUNT(*) as active_projects FROM projects WHERE deadline > NOW()')
    const contributorsResult = await pool.query('SELECT COUNT(DISTINCT donor_id) as unique_contributors FROM donations')
    
    const totalRaised = parseFloat(totalRaisedResult.rows[0].total_raised || 0)
    const totalProjects = parseInt(totalProjectsResult.rows[0].total_projects || 0)
    const activeProjects = parseInt(activeProjectsResult.rows[0].active_projects || 0)
    const uniqueContributors = parseInt(contributorsResult.rows[0].unique_contributors || 0)
    
    // Calcular proyectos exitosos (que han alcanzado su meta)
    const successfulResult = await pool.query('SELECT COUNT(*) as successful FROM projects WHERE current_amount >= goal_amount')
    const successful = parseInt(successfulResult.rows[0].successful || 0)
    const successRate = totalProjects > 0 ? Math.round((successful / totalProjects) * 100) : 0

    const response = {
      total_raised: totalRaised,
      total_projects: totalProjects,
      active_projects: activeProjects,
      successful_projects: successful,
      success_rate: successRate,
      unique_contributors: uniqueContributors
    }
    
    console.log('Stats response:', response)
    res.json(response)
  } catch (err) {
    console.error('Error calculating stats:', err)
    res.status(500).json({ error: err.message })
  }
})

// 2. Crear un nuevo proyecto
app.post('/projects', async (req, res) => {
  const { creator_id, title, description, goal_amount, category, deadline } = req.body
  try {
    const result = await pool.query(`
      INSERT INTO projects (creator_id, title, description, goal_amount, category, deadline)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [creator_id, title, description, goal_amount, category, deadline])
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 3. Registrar donación y actualizar monto
app.post('/donations', async (req, res) => {
  const { donor_id, project_id, amount, tx_signature } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Insertar donación
    const donationResult = await client.query(`
      INSERT INTO donations (donor_id, project_id, amount, tx_signature)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [donor_id, project_id, amount, tx_signature])

    // Actualizar monto actual
    await client.query(`
      UPDATE projects
      SET current_amount = current_amount + $1
      WHERE id = $2;
    `, [amount, project_id])

    await client.query('COMMIT')
    res.status(201).json(donationResult.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// 4. Listar donaciones de un proyecto
app.get('/projects/:id/donations', async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query(`
      SELECT d.id, d.amount, d.tx_signature, d.donated_at, u.wallet_address AS donor_wallet
      FROM donations d
      JOIN users u ON d.donor_id = u.id
      WHERE d.project_id = $1
    `, [id])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(3000, () => {
  console.log('API running on port 3000')
})
