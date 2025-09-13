// Script para limpiar la base de datos directamente
import pkg from 'pg'
import dotenv from 'dotenv'

dotenv.config()
const { Pool } = pkg

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  port: process.env.DB_PORT || 5432,
})

const cleanDatabase = async () => {
  try {
    console.log('🧹 Limpiando base de datos...')
    
    // Eliminar todas las donaciones primero (por la foreign key)
    await pool.query('DELETE FROM donations')
    console.log('✅ Donaciones eliminadas')
    
    // Eliminar todos los proyectos
    await pool.query('DELETE FROM projects')
    console.log('✅ Proyectos eliminados')
    
    // Resetear las secuencias para que los IDs empiecen desde 1
    await pool.query('ALTER SEQUENCE projects_id_seq RESTART WITH 1')
    await pool.query('ALTER SEQUENCE donations_id_seq RESTART WITH 1')
    console.log('✅ Secuencias reseteadas')
    
    // Crear usuario oficial de SolRaise
    console.log('👤 Creando usuario oficial...')
    const userResult = await pool.query(`
      INSERT INTO users (wallet_address)
      VALUES ($1)
      ON CONFLICT (wallet_address) DO UPDATE SET wallet_address = EXCLUDED.wallet_address
      RETURNING *
    `, ['SolRaiseOfficialWallet2024'])
    
    const userData = userResult.rows[0]
    console.log('Usuario oficial creado:', userData)
    
    // Crear proyecto oficial
    console.log('🚀 Creando proyecto oficial...')
    const projectResult = await pool.query(`
      INSERT INTO projects (creator_id, title, description, goal_amount, category, deadline, social_platform, social_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      userData.id,
      'Desarrollo de SolRaise - Plataforma de Crowdfunding en Solana',
      'SolRaise es una plataforma revolucionaria de crowdfunding construida en la blockchain de Solana. Permite a creadores lanzar campañas de financiación colectiva de manera descentralizada, transparente y con bajas comisiones. Únete a nosotros en esta travesía hacia el futuro del financiamiento colaborativo.',
      10000,
      'DeFi',
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      'twitter',
      'https://twitter.com/solraise_official'
    ])
    
    const newProject = projectResult.rows[0]
    console.log('🎉 Proyecto oficial creado:', newProject)
    
    console.log('\n✅ ¡Base de datos lista para despliegue!')
    console.log('🚀 La plataforma ahora tiene únicamente el proyecto oficial de SolRaise')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await pool.end()
  }
}

cleanDatabase()
