-- Crear tabla users (si no existe)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla projects
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  current_amount NUMERIC DEFAULT 0,
  goal_amount NUMERIC NOT NULL,
  category VARCHAR(100),
  deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creator_id INTEGER REFERENCES users(id)
);

-- Crear tabla donations (si no existe)
CREATE TABLE IF NOT EXISTS donations (
  id SERIAL PRIMARY KEY,
  donor_id INTEGER REFERENCES users(id),
  project_id INTEGER REFERENCES projects(id),
  amount NUMERIC NOT NULL,
  tx_signature VARCHAR(200),
  donated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar un usuario de prueba
INSERT INTO users (wallet_address) VALUES ('demo_wallet_123') ON CONFLICT (wallet_address) DO NOTHING;

-- Insertar proyectos de prueba
INSERT INTO projects (title, description, current_amount, goal_amount, category, deadline, creator_id)
VALUES
('DeFi Gaming Platform', 'Una plataforma descentralizada de gaming que revolucionará la industria del entretenimiento blockchain con NFTs y DeFi integrados.', 1250, 5000, 'Gaming', NOW() + INTERVAL '15 days', 1),
('Eco-Friendly NFT Marketplace', 'Marketplace sostenible para NFTs con compensación de huella de carbono automática y energía renovable.', 3200, 8000, 'NFT', NOW() + INTERVAL '22 days', 1),
('Solar Energy DAO', 'DAO para financiar proyectos de energía solar en comunidades rurales usando blockchain para transparencia total.', 850, 3000, 'Green Tech', NOW() + INTERVAL '30 days', 1),
('Cross-Chain Bridge Protocol', 'Protocolo seguro para intercambiar assets entre diferentes blockchains de manera descentralizada.', 4500, 10000, 'DeFi', NOW() + INTERVAL '45 days', 1)
ON CONFLICT DO NOTHING;
