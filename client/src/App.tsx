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

  // Estado para los proyectos desde la API
  const [featuredProjects, setFeaturedProjects] = useState<any[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  
  // Estado para las estadísticas desde la API
  const [stats, setStats] = useState({
    total_raised: 0,
    active_projects: 0,
    unique_contributors: 0,
    success_rate: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)
  
  // Estado para las categorías desde la API
  const [categories, setCategories] = useState<any[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  // Estado para el formulario de crear proyecto
  const [createProjectForm, setCreateProjectForm] = useState({
    title: '',
    description: '',
    goal_amount: '',
    category: '',
    deadline: ''
  })
  const [isCreatingProject, setIsCreatingProject] = useState(false)

  // Cargar proyectos desde la API
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true)
        const response = await fetch('http://localhost:3000/projects')
        if (!response.ok) {
          throw new Error('Error al cargar proyectos')
        }
        const data = await response.json()
        
        // Transformar los datos para que coincidan con el formato esperado por el frontend
        const transformedProjects = data.map((project: any) => ({
          id: project.id,
          title: project.title,
          description: project.description,
          raised: project.current_amount,
          goal: project.goal_amount,
          daysLeft: project.deadline ? Math.max(0, Math.ceil((new Date(project.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0,
          image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=250&fit=crop",
          category: project.category,
          creator_wallet: project.creator_wallet
        }))
        
        setFeaturedProjects(transformedProjects)
      } catch (error) {
        console.error('Error cargando proyectos:', error)
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'No se pudieron cargar los proyectos desde la base de datos'
        })
        // Usar datos de respaldo en caso de error
        setFeaturedProjects([
          {
            id: 1,
            title: "DeFi Gaming Platform",
            description: "Plataforma de juegos descentralizada que combina NFTs y yield farming para crear una economía gaming sostenible.",
            raised: 1250,
            goal: 5000,
            daysLeft: 15,
            image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=250&fit=crop"
          }
        ])
      } finally {
        setLoadingProjects(false)
      }
    }

    loadProjects()
  }, [])

  // Cargar estadísticas desde la API
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoadingStats(true)
        const response = await fetch('http://localhost:3000/stats')
        if (!response.ok) {
          throw new Error('Error al cargar estadísticas')
        }
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error cargando estadísticas:', error)
        addNotification({
          type: 'warning',
          title: 'Advertencia',
          message: 'No se pudieron cargar las estadísticas en tiempo real'
        })
      } finally {
        setLoadingStats(false)
      }
    }

    loadStats()
  }, [])

  // Cargar categorías desde la API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true)
        const response = await fetch('http://localhost:3000/categories')
        if (!response.ok) {
          throw new Error('Error al cargar categorías')
        }
        const data = await response.json()
        setCategories(data)
      } catch (error) {
        console.error('Error cargando categorías:', error)
        // Usar categorías de respaldo en caso de error
        setCategories([
          { name: 'Gaming', project_count: 1, icon: '🎮' },
          { name: 'DeFi', project_count: 1, icon: '🏦' },
          { name: 'NFT', project_count: 1, icon: '🎨' },
          { name: 'Green Tech', project_count: 1, icon: '🌱' }
        ])
      } finally {
        setLoadingCategories(false)
      }
    }

    loadCategories()
  }, [])

  // Función para obtener el icono de la categoría
  const getCategoryIcon = (categoryName: string) => {
    const icons: { [key: string]: string } = {
      'Gaming': '🎮',
      'DeFi': '🏦',
      'NFT': '🎨',
      'Green Tech': '🌱',
      'Educación': '📚',
      'Herramientas': '🔧',
      'default': '📦'
    }
    return icons[categoryName] || icons['default']
  }

  // Función para manejar cambios en el formulario de crear proyecto
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setCreateProjectForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Función para crear un nuevo proyecto
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!connected || !publicKey) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Debes conectar tu wallet para crear un proyecto'
      })
      return
    }

    if (!createProjectForm.title || !createProjectForm.description || !createProjectForm.goal_amount) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Por favor completa todos los campos obligatorios'
      })
      return
    }

    try {
      setIsCreatingProject(true)
      
      // First, create or get user
      const userResponse = await fetch('http://localhost:3000/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: publicKey.toString()
        })
      })
      
      let userData
      if (userResponse.ok) {
        userData = await userResponse.json()
      } else {
        // If user already exists, get the user
        const getUserResponse = await fetch(`http://localhost:3000/users/${publicKey.toString()}`)
        if (getUserResponse.ok) {
          userData = await getUserResponse.json()
        } else {
          throw new Error('Error creating or finding user')
        }
      }

      // Create the project
      const projectData = {
        creator_id: userData.id,
        title: createProjectForm.title,
        description: createProjectForm.description,
        goal_amount: parseFloat(createProjectForm.goal_amount),
        category: createProjectForm.category || 'Other',
        deadline: createProjectForm.deadline ? new Date(createProjectForm.deadline).toISOString() : null
      }

      const response = await fetch('http://localhost:3000/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData)
      })

      if (response.ok) {
        const newProject = await response.json()
        addNotification({
          type: 'success',
          title: 'Éxito',
          message: 'Proyecto creado exitosamente!'
        })
        
        // Reset form
        setCreateProjectForm({
          title: '',
          description: '',
          goal_amount: '',
          category: '',
          deadline: ''
        })
        
        // Switch to explore tab and reload projects
        setActiveTab('explore')
        // Reload projects to show the new one
        window.location.reload()
      } else {
        throw new Error('Error creating project')
      }
    } catch (error) {
      console.error('Error creating project:', error)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al crear el proyecto. Inténtalo de nuevo.'
      })
    } finally {
      setIsCreatingProject(false)
    }
  }

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

      {/* Hero Section - Only show in explore tab */}
      {activeTab === 'explore' && (
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <h1>Impulsa el futuro con <span className="highlight">Solana</span></h1>
              <p>
                Descubre y financia proyectos innovadores en el ecosistema Solana. 
                Rápido, seguro y descentralizado.
              </p>
              <div className="hero-actions">
                <button className="cta-btn primary" onClick={() => setActiveTab('explore')}>Explorar Proyectos</button>
                <button className="cta-btn secondary" onClick={() => setActiveTab('create')}>Crear Proyecto</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Create Project Form */}
      {activeTab === 'create' && (
        <section className="create-project">
          <div className="container">
            <div className="create-project-content">
              <h1>Crear Nuevo Proyecto</h1>
              <p>Comparte tu idea innovadora con la comunidad Solana</p>
              
              <form onSubmit={handleCreateProject} className="create-project-form">
                <div className="form-group">
                  <label htmlFor="title">Título del Proyecto *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={createProjectForm.title}
                    onChange={handleFormChange}
                    placeholder="Ingresa el título de tu proyecto"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Descripción *</label>
                  <textarea
                    id="description"
                    name="description"
                    value={createProjectForm.description}
                    onChange={handleFormChange}
                    placeholder="Describe tu proyecto en detalle..."
                    rows={4}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="goal_amount">Meta de Financiación (SOL) *</label>
                    <input
                      type="number"
                      id="goal_amount"
                      name="goal_amount"
                      value={createProjectForm.goal_amount}
                      onChange={handleFormChange}
                      placeholder="1000"
                      min="1"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="category">Categoría</label>
                    <select
                      id="category"
                      name="category"
                      value={createProjectForm.category}
                      onChange={handleFormChange}
                    >
                      <option value="">Selecciona una categoría</option>
                      <option value="Gaming">Gaming</option>
                      <option value="DeFi">DeFi</option>
                      <option value="NFT">NFT</option>
                      <option value="Green Tech">Green Tech</option>
                      <option value="Educación">Educación</option>
                      <option value="Other">Otros</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="deadline">Fecha Límite</label>
                  <input
                    type="datetime-local"
                    id="deadline"
                    name="deadline"
                    value={createProjectForm.deadline}
                    onChange={handleFormChange}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setActiveTab('explore')}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={isCreatingProject}
                  >
                    {isCreatingProject ? 'Creando...' : 'Crear Proyecto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* Stats Section - Only show in explore tab */}
      {activeTab === 'explore' && (
        <section className="stats">
        <div className="container">
          <div className="stats-grid">
            <StatsCard 
              title="Total Recaudado" 
              value={loadingStats ? "Cargando..." : `${stats.total_raised.toFixed(2)} SOL`}
              icon="💰" 
            />
            <StatsCard 
              title="Proyectos Activos" 
              value={loadingStats ? "Cargando..." : stats.active_projects.toString()}
              icon="🚀" 
            />
            <StatsCard 
              title="Contribuyentes" 
              value={loadingStats ? "Cargando..." : stats.unique_contributors.toString()}
              icon="👥" 
            />
            <StatsCard 
              title="Proyectos Exitosos" 
              value={loadingStats ? "Cargando..." : `${stats.success_rate}%`}
              icon="✅" 
            />
          </div>
        </div>
        </section>
      )}

      {/* Featured Projects - Only show in explore tab */}
      {activeTab === 'explore' && (
        <section className="featured-projects">
          <div className="container">
            <h2>Proyectos Destacados</h2>
            <div className="projects-grid">
              {loadingProjects ? (
                <div className="loading-projects">
                  <p>Cargando proyectos desde la base de datos...</p>
                </div>
              ) : (
                featuredProjects.map((project, index) => (
                  <ProjectCard 
                    key={project.id || index} 
                    {...project} 
                    onContribute={() => handleContribute(project)}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Categories - Only show in explore tab */}
      {activeTab === 'explore' && (
      <section className="categories">
        <div className="container">
          <h2>Categorías Populares</h2>
          <div className="categories-grid">
            {loadingCategories ? (
              <div className="loading-categories">
                <p>Cargando categorías...</p>
              </div>
            ) : (
              categories.map((category, index) => (
                <div key={index} className="category-card">
                  <div className="category-icon">{getCategoryIcon(category.name)}</div>
                  <h3>{category.name}</h3>
                  <p>{category.project_count} proyecto{category.project_count !== 1 ? 's' : ''}</p>
                  {category.total_raised > 0 && (
                    <small>{category.total_raised.toFixed(2)} SOL recaudados</small>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        </section>
      )}

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