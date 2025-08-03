import { useState, useMemo, useEffect } from 'react'
import { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet
} from '@solana/wallet-adapter-react'
import {
  WalletModalProvider,
  WalletMultiButton,
  WalletDisconnectButton
} from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import './App.css'

// Importar estilos de wallet UI
import '@solana/wallet-adapter-react-ui/styles.css'

// Tipos para las notificaciones
type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number
}

// Componente de notificaciones
const NotificationContainer = ({ 
  notifications, 
  removeNotification 
}: {
  notifications: Notification[]
  removeNotification: (id: string) => void
}) => {
  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}

const NotificationCard = ({
  notification,
  onClose
}: {
  notification: Notification
  onClose: () => void
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, notification.duration || 5000)

    return () => clearTimeout(timer)
  }, [notification.duration, onClose])

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return 'ℹ️'
    }
  }

  return (
    <div className={`notification-card notification-${notification.type}`}>
      <div className="notification-icon">
        {getIcon(notification.type)}
      </div>
      <div className="notification-content">
        <h4>{notification.title}</h4>
        <p>{notification.message}</p>
      </div>
      <button className="notification-close" onClick={onClose}>
        ×
      </button>
    </div>
  )
}

// Componente para mostrar información del wallet
const WalletInfo = () => {
  const { connection } = useConnection()
  const { publicKey, connected } = useWallet()
  const [balance, setBalance] = useState<number | null>(null)

  const getBalance = async () => {
    if (publicKey && connected) {
      try {
        const balance = await connection.getBalance(publicKey)
        setBalance(balance / LAMPORTS_PER_SOL)
      } catch (error) {
        console.error('Error obteniendo balance:', error)
      }
    }
  }

  // Obtener balance cuando se conecta
  useState(() => {
    if (connected && publicKey) {
      getBalance()
    }
  })

  if (!connected) return null

  return (
    <div className="wallet-info">
      <div className="wallet-balance">
        {balance !== null ? (
          <span>{balance.toFixed(4)} SOL</span>
        ) : (
          <span>Cargando...</span>
        )}
      </div>
      <div className="wallet-address">
        {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
      </div>
    </div>
  )
}

// Componente para las tarjetas de proyectos
const ProjectCard = ({ 
  title, 
  description, 
  raised, 
  goal, 
  daysLeft, 
  image,
  onContribute 
}: {
  title: string
  description: string
  raised: number
  goal: number
  daysLeft: number
  image: string
  onContribute: () => void
}) => {
  const progress = (raised / goal) * 100

  return (
    <div className="project-card">
      <img src={image} alt={title} className="project-image" />
      <div className="project-content">
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <div className="progress-info">
            <span>{raised.toLocaleString()} SOL recaudados</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
        </div>
        <div className="project-meta">
          <span className="goal">Meta: {goal.toLocaleString()} SOL</span>
          <span className="days-left">{daysLeft} días restantes</span>
        </div>
        <button className="contribute-btn" onClick={onContribute}>
          Contribuir
        </button>
      </div>
    </div>
  )
}

// Componente para las estadísticas
const StatsCard = ({ 
  title, 
  value, 
  icon 
}: {
  title: string
  value: string
  icon: string
}) => (
  <div className="stats-card">
    <div className="stats-icon">{icon}</div>
    <div className="stats-content">
      <h3>{value}</h3>
      <p>{title}</p>
    </div>
  </div>
)

// Componente principal de la aplicación
const AppContent = () => {
  const [activeTab, setActiveTab] = useState('explore')
  const [showContributeModal, setShowContributeModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { connected, publicKey } = useWallet()

  // Función para agregar notificaciones
  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString()
    setNotifications(prev => [...prev, { ...notification, id }])
  }

  // Función para remover notificaciones
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleContribute = (project: any) => {
    if (!connected) {
      addNotification({
        type: 'warning',
        title: 'Wallet no conectado',
        message: 'Por favor conecta tu wallet para contribuir a este proyecto'
      })
      return
    }
    setSelectedProject(project)
    setShowContributeModal(true)
  }

  // Datos de ejemplo para los proyectos
  const featuredProjects = [
    {
      title: "DeFi Gaming Platform",
      description: "Plataforma de juegos descentralizada que combina NFTs y yield farming para crear una economía gaming sostenible.",
      raised: 1250,
      goal: 5000,
      daysLeft: 15,
      image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=250&fit=crop"
    },
    {
      title: "Eco-Friendly NFT Marketplace",
      description: "Marketplace de NFTs enfocado en arte digital sostenible y proyectos de impacto medioambiental.",
      raised: 3200,
      goal: 8000,
      daysLeft: 22,
      image: "https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?w=400&h=250&fit=crop"
    },
    {
      title: "Solana Education Hub",
      description: "Plataforma educativa para desarrolladores que quieren aprender a construir en el ecosistema Solana.",
      raised: 890,
      goal: 2500,
      daysLeft: 8,
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop"
    }
  ]

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="nav">
            <div className="logo">
              <h1>Sol<span className="highlight">Raise</span></h1>
              <p>Crowdfunding on Solana</p>
            </div>
            <nav className="nav-menu">
              <button 
                className={activeTab === 'explore' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setActiveTab('explore')}
              >
                Explorar
              </button>
              <button 
                className={activeTab === 'create' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setActiveTab('create')}
              >
                Crear Proyecto
              </button>
              <button 
                className={activeTab === 'my-projects' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setActiveTab('my-projects')}
              >
                Mis Proyectos
              </button>
            </nav>
            <div className="wallet-section">
              <WalletInfo />
              <WalletMultiButton className="wallet-btn" />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Impulsa el futuro con <span className="highlight">Solana</span></h1>
            <p>
              Descubre y financia proyectos innovadores en el ecosistema Solana. 
              Rápido, seguro y descentralizado.
            </p>
            <div className="hero-actions">
              <button className="cta-btn primary">Explorar Proyectos</button>
              <button className="cta-btn secondary">Crear Proyecto</button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            <StatsCard 
              title="Total Recaudado" 
              value="1.2M SOL" 
              icon="💰" 
            />
            <StatsCard 
              title="Proyectos Activos" 
              value="156" 
              icon="🚀" 
            />
            <StatsCard 
              title="Contribuyentes" 
              value="8,429" 
              icon="👥" 
            />
            <StatsCard 
              title="Proyectos Exitosos" 
              value="89%" 
              icon="✅" 
            />
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="featured-projects">
        <div className="container">
          <h2>Proyectos Destacados</h2>
          <div className="projects-grid">
            {featuredProjects.map((project, index) => (
              <ProjectCard 
                key={index} 
                {...project} 
                onContribute={() => handleContribute(project)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="categories">
        <div className="container">
          <h2>Categorías Populares</h2>
          <div className="categories-grid">
            <div className="category-card">
              <div className="category-icon">🎮</div>
              <h3>Gaming</h3>
              <p>45 proyectos</p>
            </div>
            <div className="category-card">
              <div className="category-icon">🏦</div>
              <h3>DeFi</h3>
              <p>32 proyectos</p>
            </div>
            <div className="category-card">
              <div className="category-icon">🎨</div>
              <h3>NFTs</h3>
              <p>28 proyectos</p>
            </div>
            <div className="category-card">
              <div className="category-icon">📚</div>
              <h3>Educación</h3>
              <p>19 proyectos</p>
            </div>
            <div className="category-card">
              <div className="category-icon">🌱</div>
              <h3>Sostenibilidad</h3>
              <p>15 proyectos</p>
            </div>
            <div className="category-card">
              <div className="category-icon">🔧</div>
              <h3>Herramientas</h3>
              <p>23 proyectos</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>SolRaise</h3>
              <p>La plataforma de crowdfunding más rápida y segura en Solana</p>
            </div>
            <div className="footer-section">
              <h4>Plataforma</h4>
              <ul>
                <li><a href="#">Explorar Proyectos</a></li>
                <li><a href="#">Crear Proyecto</a></li>
                <li><a href="#">Cómo Funciona</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Soporte</h4>
              <ul>
                <li><a href="#">Centro de Ayuda</a></li>
                <li><a href="#">Contacto</a></li>
                <li><a href="#">FAQ</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Comunidad</h4>
              <ul>
                <li><a href="#">Discord</a></li>
                <li><a href="#">Twitter</a></li>
                <li><a href="#">Telegram</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 SolRaise. Construido en Solana.</p>
          </div>
        </div>
      </footer>

      {/* Modal de contribución */}
      {showContributeModal && selectedProject && (
        <ContributeModal 
          project={selectedProject}
          onClose={() => setShowContributeModal(false)}
          addNotification={addNotification}
        />
      )}

      {/* Sistema de notificaciones */}
      <NotificationContainer 
        notifications={notifications}
        removeNotification={removeNotification}
      />
    </div>
  )
}

// Modal para contribuir a un proyecto
const ContributeModal = ({ 
  project, 
  onClose,
  addNotification
}: {
  project: any
  onClose: () => void
  addNotification: (notification: Omit<Notification, 'id'>) => void
}) => {
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()

  const handleContribute = async () => {
    if (!publicKey || !amount) return

    setIsLoading(true)
    
    try {
      // Simulamos una transacción (aquí iría la lógica real de Solana)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      addNotification({
        type: 'success',
        title: '¡Contribución exitosa!',
        message: `Has contribuido ${amount} SOL al proyecto "${project.title}"`
      })
      
      onClose()
    } catch (error) {
      console.error('Error en contribución:', error)
      addNotification({
        type: 'error',
        title: 'Error en la contribución',
        message: 'No se pudo procesar la transacción. Inténtalo de nuevo.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Contribuir a: {project.title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="project-summary">
            <img src={project.image} alt={project.title} />
            <div className="project-info">
              <p><strong>Meta:</strong> {project.goal.toLocaleString()} SOL</p>
              <p><strong>Recaudado:</strong> {project.raised.toLocaleString()} SOL</p>
              <p><strong>Días restantes:</strong> {project.daysLeft}</p>
            </div>
          </div>
          <div className="contribute-form">
            <label htmlFor="amount">Cantidad a contribuir (SOL):</label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            <div className="contribute-actions">
              <button className="cancel-btn" onClick={onClose}>
                Cancelar
              </button>
              <button 
                className="confirm-btn" 
                onClick={handleContribute}
                disabled={!amount || parseFloat(amount) <= 0 || isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Procesando...
                  </>
                ) : (
                  `Contribuir ${amount} SOL`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente principal con proveedores de Solana
function App() {
  // Configuración de la red de Solana (devnet para desarrollo)
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])
  
  // Lista de wallets soportados
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AppContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default App