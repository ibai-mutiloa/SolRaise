import { useState, useMemo, useEffect, useCallback } from 'react'
import { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js'
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

// Modal de donación
const DonationModal = ({ 
  project, 
  onClose, 
  onDonate 
}: {
  project: any
  onClose: () => void
  onDonate: (amount: number) => Promise<boolean>
}) => {
  const [donationAmount, setDonationAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [localProject, setLocalProject] = useState(project)

  // Actualizar localProject cuando project cambie
  useEffect(() => {
    setLocalProject(project)
  }, [project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const amount = parseFloat(donationAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor ingresa una cantidad válida')
      return
    }

    setIsProcessing(true)
    const success = await onDonate(amount)
    setIsProcessing(false)
    
    if (success) {
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Contribuir al Proyecto</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="project-info">
            <h3>{localProject.title}</h3>
            <p>Meta: {localProject.goal} SOL</p>
            <p>Recaudado: {localProject.raised} SOL</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min((localProject.raised / localProject.goal) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="progress-percentage">
              {((localProject.raised / localProject.goal) * 100).toFixed(1)}% completado
            </p>
          </div>

          <form onSubmit={handleSubmit} className="donation-form">
            <div className="form-group">
              <label htmlFor="donation-amount">Cantidad a donar (SOL)</label>
              <input
                type="number"
                id="donation-amount"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                placeholder="0.1"
                min="0.001"
                step="0.001"
                required
                disabled={isProcessing}
              />
            </div>

            <div className="donation-buttons">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={isProcessing}
              >
                {isProcessing ? 'Procesando...' : 'Donar SOL'}
              </button>
            </div>
          </form>

          <div className="donation-info">
            <p><strong>⚠️ Importante:</strong></p>
            <ul>
              <li>Esta transacción será procesada en la blockchain de Solana</li>
              <li>Necesitarás confirmar la transacción en tu wallet</li>
              <li>Las transacciones son irreversibles</li>
              <li>Se aplicarán tarifas de red de Solana (~0.000005 SOL)</li>
              <li>La confirmación puede tomar hasta 60 segundos</li>
              <li>Puedes verificar tu transacción en Solana Explorer</li>
            </ul>
          </div>
        </div>
      </div>
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

// Componente para verificar transacciones manualmente
const TransactionVerifier = ({ verifyTransaction }: { verifyTransaction: (signature: string) => Promise<void> }) => {
  const [signature, setSignature] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const handleVerify = async () => {
    if (!signature.trim()) return
    
    setIsVerifying(true)
    try {
      await verifyTransaction(signature.trim())
    } finally {
      setIsVerifying(false)
      setSignature('')
    }
  }

  const handlePasteExample = () => {
    setSignature('49KGUCiTjcFcYENC9NhLxfzPoxJQFxgqD3X2d1KuTpRDtFaABpzR7iigwBqmPqNQLjKRSA8k1N9oA36zrT2Dptvf')
  }

  return (
    <div className="transaction-verifier">
      <div className="verifier-header">
        <h3>🔍 Verificar Transacción</h3>
        <p>Verifica el estado de una transacción de Solana</p>
        <small>Si tu donación dio timeout, puedes verificar su estado aquí</small>
      </div>
      <div className="verifier-input">
        <input
          type="text"
          placeholder="Ingresa la signature de la transacción..."
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          className="signature-input"
        />
        <button
          onClick={handleVerify}
          disabled={!signature.trim() || isVerifying}
          className="verify-btn"
        >
          {isVerifying ? 'Verificando...' : 'Verificar'}
        </button>
      </div>
      <div className="verifier-actions">
        <button
          onClick={handlePasteExample}
          className="paste-example-btn"
          disabled={isVerifying}
        >
          Pegar signature de ejemplo
        </button>
        <a
          href={signature.trim() ? `https://explorer.solana.com/tx/${signature.trim()}?cluster=devnet` : '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={`explorer-link ${!signature.trim() ? 'disabled' : ''}`}
        >
          Ver en Solana Explorer 🔗
        </a>
      </div>
    </div>
  )
}

// Componente de diagnóstico de conexión
const ConnectionDiagnostic = () => {
  const { connection } = useConnection()
  const { publicKey, connected } = useWallet()
  const [diagnostics, setDiagnostics] = useState<any>({})
  const [isRunning, setIsRunning] = useState(false)

  const runDiagnostics = async () => {
    if (!connected || !publicKey) return
    
    setIsRunning(true)
    const results: any = {}
    
    try {
      // Test 1: Verificar conexión RPC
      console.log('Testing RPC connection...')
      const version = await connection.getVersion()
      results.rpcConnection = { status: 'OK', version }
      
      // Test 2: Verificar balance
      console.log('Testing balance fetch...')
      const balance = await connection.getBalance(publicKey)
      results.balance = { status: 'OK', balance: balance / LAMPORTS_PER_SOL }
      
      // Test 3: Verificar blockhash reciente
      console.log('Testing recent blockhash...')
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      results.blockhash = { status: 'OK', blockhash: blockhash.slice(0, 8) + '...', lastValidBlockHeight }
      
      // Test 4: Verificar slot actual
      console.log('Testing current slot...')
      const slot = await connection.getSlot()
      results.slot = { status: 'OK', slot }
      
    } catch (error: any) {
      results.error = { status: 'ERROR', message: error.message }
    }
    
    setDiagnostics(results)
    setIsRunning(false)
  }

  if (!connected) return null

  return (
    <div className="connection-diagnostic">
      <h4>🔧 Diagnóstico de Conexión</h4>
      <button onClick={runDiagnostics} disabled={isRunning} className="diagnostic-btn">
        {isRunning ? 'Ejecutando...' : 'Ejecutar Diagnóstico'}
      </button>
      
      {Object.keys(diagnostics).length > 0 && (
        <div className="diagnostic-results">
          {Object.entries(diagnostics).map(([key, value]: [string, any]) => (
            <div key={key} className={`diagnostic-item ${value.status}`}>
              <strong>{key}:</strong> {value.status}
              {value.balance !== undefined && <span> - {value.balance.toFixed(6)} SOL</span>}
              {value.blockhash && <span> - {value.blockhash}</span>}
              {value.slot && <span> - Slot: {value.slot}</span>}
              {value.message && <span> - {value.message}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Componente para obtener SOL de prueba
const DevnetFaucet = () => {
  const { publicKey, connected } = useWallet()
  const [isRequesting, setIsRequesting] = useState(false)

  const requestAirdrop = async () => {
    if (!connected || !publicKey) return
    
    setIsRequesting(true)
    try {
      // Abrir el faucet oficial de Solana en una nueva pestaña
      const faucetURL = `https://faucet.solana.com/?address=${publicKey.toString()}&cluster=devnet`
      window.open(faucetURL, '_blank')
      
      // También mostrar instrucciones
      alert(`Se abrió el faucet de Solana en una nueva pestaña.\n\nTambién puedes obtener SOL usando CLI:\nsolana airdrop 2 ${publicKey.toString()} --url devnet`)
      
    } catch (error) {
      console.error('Error opening faucet:', error)
      alert('Error al abrir el faucet. Puedes visitar manualmente: https://faucet.solana.com/')
    } finally {
      setIsRequesting(false)
    }
  }

  if (!connected) return null

  return (
    <div className="devnet-faucet">
      <h4>💰 Obtener SOL de Prueba</h4>
      <p>¿Necesitas SOL para hacer donaciones? Obtén SOL gratuito en devnet:</p>
      <button onClick={requestAirdrop} disabled={isRequesting} className="faucet-btn">
        {isRequesting ? 'Abriendo faucet...' : 'Abrir Faucet de Solana'}
      </button>
      <small>
        También puedes usar CLI: <code>solana airdrop 2 {publicKey?.toString()} --url devnet</code>
      </small>
    </div>
  )
}

// Componente para las tarjetas de proyectos
const ProjectCard = ({ 
  id,
  title, 
  description, 
  raised, 
  goal, 
  daysLeft, 
  image,
  socialPlatform,
  socialUrl,
  creatorWallet,
  currentUserWallet,
  onContribute,
  onDelete
}: {
  id: number
  title: string
  description: string
  raised: number
  goal: number
  daysLeft: number
  image: string
  socialPlatform?: string
  socialUrl?: string
  creatorWallet?: string
  currentUserWallet?: string
  onContribute: () => void
  onDelete?: () => void
}) => {
  const progress = (raised / goal) * 100
  const isCreator = currentUserWallet && creatorWallet && currentUserWallet === creatorWallet
  const isOwnerProject = creatorWallet === '449ptrc7xwP2BB2EQkej6dLmBRxbhLxcWitCha8khL1z'

  // Función para obtener el ícono de la red social
  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return '�'
      case 'twitter':
        return '𝕏'
      default:
        return '🔗'
    }
  }

  return (
    <div className="project-card">
      <img src={image} alt={title} className="project-image" />
      <div className="project-content">
        <div className="project-header">
          <h3>
            {title}
            {isOwnerProject && <span className="owner-star" title="Proyecto oficial de SolRaise">⭐</span>}
          </h3>
          {socialPlatform && socialUrl && (
            <a 
              href={socialUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="social-link"
              title={`Seguir en ${socialPlatform === 'instagram' ? 'Instagram' : 'Twitter'}`}
            >
              {getSocialIcon(socialPlatform)}
            </a>
          )}
        </div>
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
        <div className="project-actions">
          <button className="contribute-btn" onClick={onContribute}>
            Contribuir
          </button>
          {isCreator && onDelete && (
            <button className="delete-btn" onClick={onDelete} title="Eliminar proyecto">
              🗑️
            </button>
          )}
        </div>
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
  const { connected, publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()

  // Función para agregar notificaciones
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString()
    setNotifications(prev => [...prev, { ...notification, id }])
  }, [])

  // Función para remover notificaciones
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

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

  const handleDeleteProject = async (project: any) => {
    if (!connected || !publicKey) {
      addNotification({
        type: 'warning',
        title: 'Wallet no conectado',
        message: 'Por favor conecta tu wallet para eliminar el proyecto'
      })
      return
    }

    // Eliminar directamente sin confirmación
    // const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar el proyecto "${project.title}"? Esta acción no se puede deshacer.`)
    // if (!confirmDelete) {
    //   return
    // }

    try {
      const response = await fetch(`http://localhost:3000/projects/${project.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creator_wallet: publicKey.toString()
        })
      })

      if (response.ok) {
        addNotification({
          type: 'success',
          title: 'Proyecto Eliminado',
          message: 'El proyecto ha sido eliminado exitosamente'
        })
        // Refresh the project list
        await refreshProjectsData()
        await refreshStats()
      } else {
        const errorData = await response.json()
        addNotification({
          type: 'error',
          title: 'Error al Eliminar',
          message: errorData.error || 'No se pudo eliminar el proyecto'
        })
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Ocurrió un error al eliminar el proyecto'
      })
    }
  }

  const handleDonation = async (amount: number): Promise<boolean> => {
    if (!selectedProject) return false
    const success = await processDonation(selectedProject, amount)
    if (success) {
      // Actualizar automáticamente el estado de los proyectos
      await refreshProjectsData()
      // También actualizar las estadísticas
      await refreshStats()
    }
    return success
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

  // Estado para los proyectos del usuario
  const [userProjects, setUserProjects] = useState<any[]>([])
  const [loadingUserProjects, setLoadingUserProjects] = useState(false)

  // Estado para el formulario de crear proyecto
  const [createProjectForm, setCreateProjectForm] = useState({
    title: '',
    description: '',
    goal_amount: '',
    category: '',
    deadline: '',
    social_platform: '', // 'instagram' o 'twitter'
    social_url: ''
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
          image: getCategoryImage(project.category),
          category: project.category,
          creator_wallet: project.creator_wallet,
          socialPlatform: project.social_platform,
          socialUrl: project.social_url
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
            image: getCategoryImage("Gaming"),
            category: "Gaming",
            creator_wallet: "SoL4n4WALLETtest1234567890abc"
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

  // Función para cargar proyectos del usuario
  const loadUserProjects = useCallback(async () => {
    console.log('loadUserProjects called', { connected, publicKey: publicKey?.toString() })
    
    if (!connected || !publicKey) {
      console.log('Wallet not connected, returning')
      return
    }

    try {
      console.log('Starting to load user projects...')
      setLoadingUserProjects(true)
      const walletAddress = publicKey.toString()
      console.log('Fetching projects for wallet:', walletAddress)
      
      const response = await fetch(`http://localhost:3000/projects/user/${walletAddress}`)
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Raw data from API:', data)
      
      // Verificar si data es un array
      if (!Array.isArray(data)) {
        console.error('API did not return an array:', data)
        throw new Error('Invalid data format from API')
      }
      
      // Transformar los datos para que coincidan con el formato esperado por el frontend
      const transformedProjects = data.map((project: any) => {
        console.log('Transforming project:', project)
        return {
          id: project.id,
          title: project.title,
          description: project.description,
          raised: parseFloat(project.current_amount) || 0,
          goal: parseFloat(project.goal_amount) || 0,
          daysLeft: project.deadline ? Math.max(0, Math.ceil((new Date(project.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0,
          image: getCategoryImage(project.category),
          category: project.category,
          creator_wallet: project.creator_wallet
        }
      })
      
      console.log('Transformed projects:', transformedProjects)
      setUserProjects(transformedProjects)
      
      addNotification({
        type: 'success',
        title: 'Éxito',
        message: `Se cargaron ${transformedProjects.length} proyectos`
      })
      
    } catch (error) {
      console.error('Error cargando proyectos del usuario:', error)
      addNotification({
        type: 'error',
        title: 'Error',
        message: `No se pudieron cargar tus proyectos: ${error instanceof Error ? error.message : 'Error desconocido'}`
      })
    } finally {
      console.log('Setting loading to false')
      setLoadingUserProjects(false)
    }
  }, [connected, publicKey, addNotification])

  // Función para procesar donación con Solana
  const processDonation = useCallback(async (project: any, donationAmount: number) => {
    if (!connected || !publicKey || !sendTransaction) {
      addNotification({
        type: 'error',
        title: 'Wallet no conectado',
        message: 'Por favor conecta tu wallet para donar'
      })
      return false
    }

    try {
      console.log('Processing donation...', { project, donationAmount })
      
      // Verificar que tenemos suficiente balance
      const balance = await connection.getBalance(publicKey)
      const balanceInSol = balance / LAMPORTS_PER_SOL
      const lamports = donationAmount * LAMPORTS_PER_SOL
      const transactionFee = 0.000005 // Aproximadamente 0.000005 SOL por fee de transacción
      
      console.log('Wallet balance:', balanceInSol, 'SOL')
      console.log('Donation amount:', donationAmount, 'SOL')
      console.log('Estimated fee:', transactionFee, 'SOL')
      
      if (balanceInSol < (donationAmount + transactionFee)) {
        addNotification({
          type: 'error',
          title: 'Balance insuficiente',
          message: `Necesitas al menos ${donationAmount + transactionFee} SOL (incluyendo fees). Tu balance: ${balanceInSol.toFixed(6)} SOL`
        })
        return false
      }

      // Crear la dirección pública del creador del proyecto
      const creatorPublicKey = new PublicKey(project.creator_wallet)
      console.log('Creator wallet:', project.creator_wallet)

      // Obtener un blockhash reciente para mejorar las probabilidades de éxito
      console.log('Getting recent blockhash...')
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      console.log('Recent blockhash:', blockhash)

      // Crear la transacción de transferencia con blockhash reciente
      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: creatorPublicKey,
          lamports: lamports,
        })
      )

      console.log('Transaction created with recent blockhash, requesting signature...')
      
      addNotification({
        type: 'info',
        title: 'Preparando transacción',
        message: 'Confirma la transacción en tu wallet...'
      })

      // Enviar la transacción y obtener la signatura
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      })
      
      console.log('Transaction signature:', signature)

      addNotification({
        type: 'info',
        title: 'Transacción enviada',
        message: 'Esperando confirmación en la blockchain...'
      })

      // Usar el método mejorado de confirmación
      console.log('Waiting for transaction confirmation...')
      
      try {
        // Confirmar la transacción usando el blockhash y altura válida
        const confirmation = await connection.confirmTransaction({
          signature: signature,
          blockhash: blockhash,
          lastValidBlockHeight: lastValidBlockHeight,
        }, 'confirmed')
        
        if (confirmation.value.err) {
          throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err))
        }
        
        console.log('Transaction confirmed successfully:', confirmation)
        
      } catch (confirmError: any) {
        console.log('Confirmation error, checking status manually...', confirmError)
        
        // Verificar el estado de la transacción manualmente
        const status = await connection.getSignatureStatus(signature)
        console.log('Manual status check:', status)
        
        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
          console.log('Transaction was actually confirmed!')
        } else if (status.value?.err) {
          throw new Error('Transaction failed: ' + JSON.stringify(status.value.err))
        } else {
          // La transacción está pendiente
          addNotification({
            type: 'warning',
            title: 'Transacción Pendiente',
            message: `La transacción está pendiente. Verifica en Solana Explorer: ${signature.slice(0, 8)}...`
          })
          console.log('Transaction is still pending. Signature:', signature)
          console.log(`Check status: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
          return false
        }
      }

      console.log('Transaction confirmed, recording in database...')

      // Registrar la donación en la base de datos
      try {
        await recordDonation({
          project_id: project.id,
          donor_wallet: publicKey.toString(),
          amount: donationAmount,
          tx_signature: signature
        })
        console.log('Donation recorded successfully in database')
      } catch (dbError) {
        console.error('Error recording donation in database:', dbError)
        // Continuar incluso si falla el registro en BD, la transacción blockchain ya se completó
        addNotification({
          type: 'warning',
          title: 'Advertencia',
          message: 'La donación se completó en blockchain pero hubo un error al registrarla en la base de datos'
        })
      }

      // Mostrar feedback inmediato y actualizar el proyecto localmente
      const updatedProject = {
        ...project,
        raised: project.raised + donationAmount
      }
      
      // Actualizar el proyecto seleccionado inmediatamente para feedback visual
      setSelectedProject(updatedProject)

      addNotification({
        type: 'success',
        title: '¡Donación exitosa!',
        message: `Has donado ${donationAmount} SOL al proyecto "${project.title}". Signature: ${signature.slice(0, 8)}...`
      })

      // Actualizar datos después de la confirmación
      await refreshProjectsData()
      await refreshStats()

      // Mostrar enlace al explorer
      console.log(`Transaction completed! View on Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)

      return true

    } catch (error: any) {
      console.error('Error processing donation:', error)
      
      // Capturar errores específicos de timeout de transacción
      if (error.message && error.message.includes('Transaction was not confirmed')) {
        const signatureMatch = error.message.match(/signature\s+([A-Za-z0-9]+)/);
        const signature = signatureMatch ? signatureMatch[1] : null;
        
        if (signature) {
          console.log('Caught transaction timeout with signature:', signature);
          
          // Verificar el estado de la transacción manualmente
          try {
            console.log('Checking transaction status manually...');
            const status = await connection.getSignatureStatus(signature);
            console.log('Manual status check result:', status);
            
            if (status.value?.confirmationStatus === 'confirmed' || 
                status.value?.confirmationStatus === 'finalized') {
              console.log('Transaction was actually confirmed! Recording in database...');
              
              // La transacción está confirmada, registrar en BD
              try {
                await recordDonation({
                  project_id: project.id,
                  donor_wallet: publicKey.toString(),
                  amount: donationAmount,
                  tx_signature: signature
                });
                
                // Actualizar UI
                const updatedProject = {
                  ...project,
                  raised: project.raised + donationAmount
                };
                setSelectedProject(updatedProject);
                
                addNotification({
                  type: 'success',
                  title: '¡Donación confirmada!',
                  message: `La transacción se completó exitosamente. Signature: ${signature.slice(0, 8)}...`
                });
                
                // Refrescar datos
                await refreshProjectsData();
                await refreshStats();
                
                console.log(`Transaction confirmed! View on Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
                return true;
                
              } catch (dbError) {
                console.error('Error recording confirmed donation:', dbError);
                addNotification({
                  type: 'warning',
                  title: 'Transacción Exitosa',
                  message: `La donación se completó pero hubo un error al registrarla. Verifica manualmente: ${signature.slice(0, 8)}...`
                });
                return true; // La transacción blockchain fue exitosa
              }
              
            } else if (status.value?.err) {
              addNotification({
                type: 'error',
                title: 'Transacción Fallida',
                message: `La transacción falló: ${status.value.err}`
              });
              return false;
              
            } else {
              // Transacción pendiente
              addNotification({
                type: 'warning',
                title: 'Transacción Pendiente',
                message: `La transacción está pendiente. Usa el verificador para chequear el estado: ${signature.slice(0, 8)}...`
              });
              
              console.log(`Transaction pending! View on Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
              return false;
            }
            
          } catch (statusError) {
            console.error('Error checking transaction status:', statusError);
            addNotification({
              type: 'error',
              title: 'Error de Verificación',
              message: `No se pudo verificar la transacción. Verifica manualmente en Solana Explorer: ${signature.slice(0, 8)}...`
            });
            return false;
          }
        }
      }
      
      // Error general
      addNotification({
        type: 'error',
        title: 'Error en la donación',
        message: error instanceof Error ? error.message : 'Error desconocido al procesar la donación'
      })
      return false
    }
  }, [connected, publicKey, sendTransaction, connection, addNotification])

  // Función para registrar donación en la base de datos
  const recordDonation = useCallback(async (donationData: {
    project_id: number
    donor_wallet: string
    amount: number
    tx_signature: string
  }) => {
    try {
      // Primero crear o obtener el usuario donante
      const userResponse = await fetch('http://localhost:3000/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: donationData.donor_wallet
        })
      })

      if (!userResponse.ok) {
        throw new Error('Error creating donor user')
      }

      const user = await userResponse.json()
      console.log('Donor user:', user)

      // Registrar la donación
      const donationResponse = await fetch('http://localhost:3000/donations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          donor_id: user.id,
          project_id: donationData.project_id,
          amount: donationData.amount,
          tx_signature: donationData.tx_signature
        })
      })

      if (!donationResponse.ok) {
        throw new Error('Error recording donation')
      }

      const donation = await donationResponse.json()
      console.log('Donation recorded:', donation)

      return donation

    } catch (error) {
      console.error('Error recording donation in database:', error)
      throw error
    }
  }, [])

  // Función para refrescar datos de proyectos
  const refreshProjectsData = useCallback(async () => {
    try {
      console.log('Refreshing projects data...')
      const response = await fetch('http://localhost:3000/projects')
      if (!response.ok) {
        throw new Error('Error al recargar proyectos')
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
        image: getCategoryImage(project.category),
        category: project.category,
        creator_wallet: project.creator_wallet
      }))
      
      setFeaturedProjects(transformedProjects)
      
      // Si hay un proyecto seleccionado, actualizarlo también
      if (selectedProject) {
        const updatedProject = transformedProjects.find((p: any) => p.id === selectedProject.id)
        if (updatedProject) {
          setSelectedProject(updatedProject)
        }
      }
      
      console.log('Projects data refreshed successfully')
    } catch (error) {
      console.error('Error refreshing projects:', error)
    }
  }, [selectedProject])

  // Función para refrescar estadísticas
  const refreshStats = useCallback(async () => {
    try {
      console.log('Refreshing stats...')
      const response = await fetch('http://localhost:3000/stats')
      if (!response.ok) {
        throw new Error('Error al cargar estadísticas')
      }
      const data = await response.json()
      setStats(data)
      console.log('Stats refreshed successfully')
    } catch (error) {
      console.error('Error refreshing stats:', error)
    }
  }, [])

  // Función para verificar una transacción manualmente
  const verifyTransaction = useCallback(async (signature: string) => {
    try {
      const status = await connection.getSignatureStatus(signature)
      console.log('Transaction status:', status)
      
      if (status.value?.confirmationStatus === 'confirmed' || 
          status.value?.confirmationStatus === 'finalized') {
        addNotification({
          type: 'success',
          title: 'Transacción Confirmada',
          message: `La transacción ${signature.slice(0, 8)}... ha sido confirmada exitosamente`
        })
        // Refrescar datos después de confirmar
        await refreshProjectsData()
        await refreshStats()
      } else if (status.value?.err) {
        addNotification({
          type: 'error',
          title: 'Transacción Fallida',
          message: `La transacción falló: ${status.value.err}`
        })
      } else {
        addNotification({
          type: 'info',
          title: 'Transacción Pendiente',
          message: `La transacción ${signature.slice(0, 8)}... aún está pendiente`
        })
      }
    } catch (error) {
      console.error('Error verificando transacción:', error)
      addNotification({
        type: 'error',
        title: 'Error de Verificación',
        message: 'No se pudo verificar el estado de la transacción'
      })
    }
  }, [connection, addNotification, refreshProjectsData, refreshStats])

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

  // Función para obtener imagen específica por categoría
  const getCategoryImage = (categoryName: string) => {
    const images: { [key: string]: string } = {
      'Gaming': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=250&fit=crop&auto=format',
      'DeFi': 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=250&fit=crop&auto=format',
      'NFT': 'https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?w=400&h=250&fit=crop&auto=format',
      'Green Tech': 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=400&h=250&fit=crop&auto=format',
      'Educación': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=250&fit=crop&auto=format',
      'Herramientas': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=250&fit=crop&auto=format',
      'Sostenibilidad': 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&h=250&fit=crop&auto=format',
      'Energía': 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=400&h=250&fit=crop&auto=format',
      'Other': 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=250&fit=crop&auto=format',
      'default': 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=250&fit=crop&auto=format'
    }
    return images[categoryName] || images['default']
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
        deadline: createProjectForm.deadline ? new Date(createProjectForm.deadline).toISOString() : null,
        social_platform: createProjectForm.social_platform || null,
        social_url: createProjectForm.social_url || null
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
          deadline: '',
          social_platform: '',
          social_url: ''
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

                {/* Campo de redes sociales */}
                <div className="form-section">
                  <h3>Enlaces Sociales (Opcional)</h3>
                  <p>Comparte un enlace para que los usuarios puedan seguir tu proyecto</p>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="social_platform">Plataforma</label>
                      <select
                        id="social_platform"
                        name="social_platform"
                        value={createProjectForm.social_platform}
                        onChange={handleFormChange}
                      >
                        <option value="">Selecciona una plataforma</option>
                        <option value="instagram">Instagram</option>
                        <option value="twitter">Twitter</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="social_url">Enlace</label>
                      <input
                        type="url"
                        id="social_url"
                        name="social_url"
                        value={createProjectForm.social_url}
                        onChange={handleFormChange}
                        placeholder={createProjectForm.social_platform === 'instagram' ? 'https://instagram.com/tu_usuario' : 
                                   createProjectForm.social_platform === 'twitter' ? 'https://twitter.com/tu_usuario' : 
                                   'Selecciona primero una plataforma'}
                        disabled={!createProjectForm.social_platform}
                      />
                    </div>
                  </div>
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

      {/* My Projects Section */}
      {activeTab === 'my-projects' && (
        <section className="my-projects">
          <div className="container">
            <div className="my-projects-content">
              <h1>Mis Proyectos</h1>
              <p>Gestiona y monitorea tus proyectos de crowdfunding</p>
              
              {!connected ? (
                <div className="wallet-connect-message">
                  <h3>🔗 Conecta tu Wallet</h3>
                  <p>Para ver tus proyectos, necesitas conectar tu wallet de Solana</p>
                  <WalletMultiButton className="wallet-btn" />
                </div>
              ) : (
                <div className="my-projects-actions">
                  <p>Wallet conectado: {publicKey?.toString().slice(0, 8)}...</p>
                  <button 
                    className="btn-primary"
                    onClick={async () => {
                      try {
                        console.log('Button clicked, calling loadUserProjects')
                        await loadUserProjects()
                        console.log('loadUserProjects completed successfully')
                      } catch (error) {
                        console.error('Error in button click:', error)
                        addNotification({
                          type: 'error',
                          title: 'Error',
                          message: 'Error al hacer clic en el botón'
                        })
                      }
                    }}
                    disabled={loadingUserProjects}
                  >
                    {loadingUserProjects ? 'Cargando...' : 'Cargar Mis Proyectos'}
                  </button>
                  
                  {loadingUserProjects && (
                    <div className="loading">
                      <p>Cargando tus proyectos...</p>
                    </div>
                  )}
                  
                  {!loadingUserProjects && userProjects.length === 0 && (
                    <div className="no-projects">
                      <h3>📝 No tienes proyectos aún</h3>
                      <p>¡Comienza creando tu primer proyecto y comparte tu idea con la comunidad!</p>
                      <button 
                        className="btn-primary"
                        onClick={() => setActiveTab('create')}
                      >
                        Crear Mi Primer Proyecto
                      </button>
                    </div>
                  )}
                  
                  {!loadingUserProjects && userProjects.length > 0 && (
                    <>
                      <div className="projects-summary">
                        <h3>Resumen de tus proyectos</h3>
                        <div className="summary-stats">
                          <div className="summary-card">
                            <span className="summary-number">{userProjects.length}</span>
                            <span className="summary-label">Proyectos Creados</span>
                          </div>
                          <div className="summary-card">
                            <span className="summary-number">
                              {userProjects.reduce((total, project) => total + project.raised, 0).toFixed(2)} SOL
                            </span>
                            <span className="summary-label">Total Recaudado</span>
                          </div>
                          <div className="summary-card">
                            <span className="summary-number">
                              {userProjects.reduce((total, project) => total + project.goal, 0).toFixed(2)} SOL
                            </span>
                            <span className="summary-label">Meta Total</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="user-projects-grid">
                        {userProjects.map((project) => (
                          <ProjectCard
                            key={project.id}
                            id={project.id}
                            title={project.title}
                            description={project.description}
                            raised={project.raised}
                            goal={project.goal}
                            daysLeft={project.daysLeft}
                            image={project.image}
                            socialPlatform={project.socialPlatform}
                            socialUrl={project.socialUrl}
                            creatorWallet={project.creator_wallet}
                            currentUserWallet={publicKey?.toString()}
                            onContribute={() => handleContribute(project)}
                            onDelete={() => handleDeleteProject(project)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
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
                    id={project.id}
                    title={project.title}
                    description={project.description}
                    raised={project.raised}
                    goal={project.goal}
                    daysLeft={project.daysLeft}
                    image={project.image}
                    socialPlatform={project.socialPlatform}
                    socialUrl={project.socialUrl}
                    creatorWallet={project.creator_wallet}
                    currentUserWallet={publicKey?.toString()}
                    onContribute={() => handleContribute(project)}
                    onDelete={() => handleDeleteProject(project)}
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

      {/* Transaction Verifier and Diagnostics - Only show when wallet is connected */}
      {connected && (
        <section className="transaction-verifier-section">
          <div className="container">
            <TransactionVerifier verifyTransaction={verifyTransaction} />
            <div className="diagnostic-section">
              <ConnectionDiagnostic />
              <DevnetFaucet />
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

      {/* Modal de donación */}
      {showContributeModal && selectedProject && (
        <DonationModal 
          project={selectedProject}
          onClose={() => setShowContributeModal(false)}
          onDonate={handleDonation}
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

// Componente principal con proveedores de Solana
function App() {
  // Configuración de la red de Solana (devnet para desarrollo)
  const network = WalletAdapterNetwork.Devnet
  
  // Usar múltiples endpoints para mayor confiabilidad
  const endpoint = useMemo(() => {
    // Endpoints de devnet más confiables
    const endpoints = [
      'https://api.devnet.solana.com',
      clusterApiUrl(network),
      'https://devnet.helius-rpc.com/?api-key=public', // RPC público alternativo
    ]
    
    // Usar el primer endpoint por defecto
    return endpoints[0]
  }, [network])
  
  // Lista de wallets soportados
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  )

  // Configuración adicional para la conexión
  const connectionConfig = useMemo(() => ({
    commitment: 'confirmed' as const,
    confirmTransactionInitialTimeout: 60000, // 60 segundos
  }), [])

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AppContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default App