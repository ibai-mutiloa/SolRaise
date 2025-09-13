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
        p.social_platform,
        p.social_url,
        u.wallet_address AS creator_wallet
      FROM projects p
      JOIN users u ON p.creator_id = u.id
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Endpoint para obtener proyectos de un usuario específico
app.get('/projects/user/:wallet_address', async (req, res) => {
  try {
    const { wallet_address } = req.params
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.title, 
        p.description, 
        p.goal_amount, 
        p.current_amount, 
        p.category, 
        p.deadline,
        p.created_at,
        u.wallet_address AS creator_wallet,
        (SELECT COUNT(*) FROM donations WHERE project_id = p.id) as donation_count
      FROM projects p
      JOIN users u ON p.creator_id = u.id
      WHERE u.wallet_address = $1
      ORDER BY p.created_at DESC
    `, [wallet_address])
    res.json(result.rows)
  } catch (err) {
    console.error('Error fetching user projects:', err)
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

    // Obtener estadísticas por categoría
    const categoriesResult = await pool.query(`
      SELECT 
        category,
        COUNT(*) as project_count,
        COALESCE(SUM(current_amount), 0) as total_raised_category
      FROM projects 
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category 
      ORDER BY project_count DESC
    `)

    const response = {
      total_raised: totalRaised,
      total_projects: totalProjects,
      active_projects: activeProjects,
      successful_projects: successful,
      success_rate: successRate,
      unique_contributors: uniqueContributors,
      categories: categoriesResult.rows.map(row => ({
        name: row.category,
        project_count: parseInt(row.project_count),
        total_raised: parseFloat(row.total_raised_category)
      }))
    }
    
    console.log('Stats response:', response)
    res.json(response)
  } catch (err) {
    console.error('Error calculating stats:', err)
    res.status(500).json({ error: err.message })
  }
})

// Endpoint para obtener categorías con estadísticas
app.get('/categories', async (req, res) => {
  try {
    const categoriesResult = await pool.query(`
      SELECT 
        category,
        COUNT(*) as project_count,
        COALESCE(SUM(current_amount), 0) as total_raised,
        COALESCE(AVG(current_amount), 0) as avg_raised
      FROM projects 
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category 
      ORDER BY project_count DESC
    `)

    const categories = categoriesResult.rows.map(row => ({
      name: row.category,
      project_count: parseInt(row.project_count),
      total_raised: parseFloat(row.total_raised),
      avg_raised: parseFloat(row.avg_raised)
    }))

    res.json(categories)
  } catch (err) {
    console.error('Error fetching categories:', err)
    res.status(500).json({ error: err.message })
  }
})

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working!' })
})

// Endpoint para crear o obtener usuario
app.post('/users', async (req, res) => {
  console.log('POST /users endpoint hit with body:', req.body)
  const { wallet_address } = req.body
  try {
    // Try to insert new user
    const result = await pool.query(`
      INSERT INTO users (wallet_address)
      VALUES ($1)
      ON CONFLICT (wallet_address) DO UPDATE SET wallet_address = EXCLUDED.wallet_address
      RETURNING *;
    `, [wallet_address])
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Endpoint para obtener usuario por wallet
app.get('/users/:wallet_address', async (req, res) => {
  const { wallet_address } = req.params
  try {
    const result = await pool.query(`
      SELECT * FROM users WHERE wallet_address = $1
    `, [wallet_address])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 2. Crear un nuevo proyecto
app.post('/projects', async (req, res) => {
  const { creator_id, title, description, goal_amount, category, deadline, social_platform, social_url } = req.body
  try {
    const result = await pool.query(`
      INSERT INTO projects (creator_id, title, description, goal_amount, category, deadline, social_platform, social_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `, [creator_id, title, description, goal_amount, category, deadline, social_platform, social_url])
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

// 5. Obtener proyectos de un usuario específico por wallet address
app.get('/projects/user/:wallet_address', async (req, res) => {
  const { wallet_address } = req.params
  console.log('Getting projects for wallet:', wallet_address)
  try {
    const result = await pool.query(`
      SELECT * FROM projects WHERE creator_wallet = $1
      ORDER BY created_at DESC
    `, [wallet_address])
    
    console.log('Found projects:', result.rows.length)
    res.json(result.rows)
  } catch (err) {
    console.error('Error fetching user projects:', err)
    res.status(500).json({ error: err.message })
  }
})

// 6. Eliminar un proyecto (solo el creador puede hacerlo)
app.delete('/projects/:id', async (req, res) => {
  const { id } = req.params
  const { creator_wallet } = req.body
  
  if (!creator_wallet) {
    return res.status(400).json({ error: 'Creator wallet address is required' })
  }
  
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    
    // Verificar que el proyecto existe y pertenece al creador
    const projectResult = await client.query(`
      SELECT p.*, u.wallet_address as creator_wallet 
      FROM projects p
      JOIN users u ON p.creator_id = u.id
      WHERE p.id = $1
    `, [id])
    
    if (projectResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Project not found' })
    }
    
    const project = projectResult.rows[0]
    if (project.creator_wallet !== creator_wallet) {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'Only the project creator can delete this project' })
    }
    
    // Eliminar todas las donaciones del proyecto primero
    await client.query('DELETE FROM donations WHERE project_id = $1', [id])
    
    // Eliminar el proyecto
    await client.query('DELETE FROM projects WHERE id = $1', [id])
    
    await client.query('COMMIT')
    res.json({ message: 'Project deleted successfully', deletedProject: project })
    
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error deleting project:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// Endpoint para limpiar todos los proyectos (solo para desarrollo)
app.delete('/projects/cleanup', async (req, res) => {
  try {
    // Primero eliminar todas las donaciones
    await pool.query('DELETE FROM donations')
    console.log('Donations deleted')
    
    // Luego eliminar todos los proyectos
    await pool.query('DELETE FROM projects')
    console.log('Projects deleted')
    
    // Resetear secuencias
    await pool.query('ALTER SEQUENCE projects_id_seq RESTART WITH 1')
    await pool.query('ALTER SEQUENCE donations_id_seq RESTART WITH 1')
    
    res.json({ message: 'All projects and donations cleaned successfully' })
  } catch (err) {
    console.error('Error cleaning projects:', err)
    res.status(500).json({ error: err.message })
  }
})

// Función para agregar columnas de redes sociales a la tabla projects
async function addSocialMediaColumns() {
  try {
    // Agregar columna de plataforma social si no existe
    await pool.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS social_platform VARCHAR(20) DEFAULT NULL
    `)
    
    // Agregar columna de URL social si no existe
    await pool.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS social_url VARCHAR(255) DEFAULT NULL
    `)
    
    console.log('Social media columns added to projects table')
  } catch (err) {
    console.error('Error adding social media columns:', err)
  }
}

// Ejecutar migración al iniciar el servidor
addSocialMediaColumns()

app.listen(3000, () => {
  console.log('API running on port 3000')
})
