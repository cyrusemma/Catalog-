import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, TShirt, DeviceMobile, Sneaker, Handbag, XCircle, ArrowLeft, Play, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'

type ItemType = 'good' | 'bad'

interface FallingItem {
  id: string
  x: number
  y: number
  type: ItemType
  icon: typeof TShirt
  speed: number
}

const GOOD_ICONS = [TShirt, DeviceMobile, Sneaker, Handbag]
const BAD_ICONS = [XCircle]

export default function OfflineGame() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLDivElement>(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [isMuted, setIsMuted] = useState(false)
  
  const [cartX, setCartX] = useState(50) // percentage 0-100
  const [items, setItems] = useState<FallingItem[]>([])

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Initialize High Score
  useEffect(() => {
    const stored = localStorage.getItem('offline-game-highscore')
    if (stored) setHighScore(parseInt(stored, 10))
  }, [])

  // Audio Synthesizers
  const playCatchSound = () => {
    if (isMuted) return
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') ctx.resume()
    
    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1)
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    
    osc.connect(gainNode)
    gainNode.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  }

  const playCrashSound = () => {
    if (isMuted) return
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') ctx.resume()

    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(150, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3)
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    
    osc.connect(gainNode)
    gainNode.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  }

  // Game loop refs to avoid dependency staleness
  const reqRef = useRef<number>()
  const stateRef = useRef({
    isPlaying,
    cartX,
    items,
    score,
    highScore,
    lives,
    lastSpawn: 0
  })

  useEffect(() => {
    stateRef.current = { isPlaying, cartX, items, score, highScore, lives, lastSpawn: stateRef.current.lastSpawn }
  }, [isPlaying, cartX, items, score, highScore, lives])

  // Key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!stateRef.current.isPlaying) return
      setCartX(prev => {
        if (e.key === 'ArrowLeft') return Math.max(0, prev - 5)
        if (e.key === 'ArrowRight') return Math.min(100, prev + 5)
        return prev
      })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Touch/Mouse drag
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPlaying || !canvasRef.current) return
    if (e.buttons !== 1 && e.pointerType === 'mouse') return // require click-drag for mouse
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setCartX(percent)
  }

  // Main Game Loop
  useEffect(() => {
    if (!isPlaying) return

    const loop = (time: number) => {
      const state = stateRef.current
      
      let newItems = [...state.items]
      let newScore = state.score
      let newLives = state.lives
      let newHighScore = state.highScore

      // Spawn new items
      if (time - state.lastSpawn > 1000) { // spawn every 1 second
        state.lastSpawn = time
        const isBad = Math.random() < 0.2 // 20% chance of bad item
        const IconList = isBad ? BAD_ICONS : GOOD_ICONS
        const RandomIcon = IconList[Math.floor(Math.random() * IconList.length)]
        
        newItems.push({
          id: Math.random().toString(),
          x: Math.random() * 90 + 5, // 5% to 95%
          y: -10,
          type: isBad ? 'bad' : 'good',
          icon: RandomIcon,
          speed: 0.5 + Math.random() * 0.5 + (newScore * 0.01) // gets faster as score increases
        })
      }

      // Move items and check collisions
      const CART_WIDTH = 15 // approx % width of cart
      const CART_Y = 85 // % from top where cart sits
      
      newItems = newItems.filter(item => {
        item.y += item.speed

        // Check collision
        if (item.y > CART_Y - 5 && item.y < CART_Y + 5) {
          if (Math.abs(item.x - state.cartX) < CART_WIDTH) {
            // Caught it!
            if (item.type === 'good') {
              newScore += 10
              playCatchSound()
            } else {
              newLives -= 1
              playCrashSound()
            }
            return false // remove item
          }
        }

        // Remove if off screen
        if (item.y > 110) {
          return false
        }

        return true
      })

      if (newScore > newHighScore) {
        newHighScore = newScore
      }

      if (newLives <= 0) {
        setIsGameOver(true)
        setIsPlaying(false)
        setLives(0)
        setScore(newScore)
        if (newHighScore > highScore) {
          setHighScore(newHighScore)
          localStorage.setItem('offline-game-highscore', newHighScore.toString())
        }
      } else {
        setItems(newItems)
        setScore(newScore)
        setLives(newLives)
        setHighScore(newHighScore)
        reqRef.current = requestAnimationFrame(loop)
      }
    }

    reqRef.current = requestAnimationFrame(loop)
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current)
    }
  }, [isPlaying])

  const startGame = () => {
    // initialize audio context on user interaction to comply with browser autoplay policies
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    
    setScore(0)
    setLives(3)
    setItems([])
    setIsGameOver(false)
    setIsPlaying(true)
    stateRef.current.lastSpawn = performance.now()
  }

  // Dynamic Backgrounds
  const getBackgroundClass = () => {
    if (score < 100) return "from-brand-100 via-pink-100 to-brand-50"
    if (score < 250) return "from-orange-400 via-amber-200 to-purple-400"
    return "from-indigo-900 via-blue-800 to-purple-900"
  }

  return (
    <div className="fixed inset-0 z-50 bg-brand-50 flex flex-col font-sans overflow-hidden select-none">
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br opacity-80 transition-colors duration-1000 ${getBackgroundClass()}`} />
      
      {/* Header */}
      <div className="relative z-10 p-4 flex items-center justify-between">
        <button title="Go back" aria-label="Go back" onClick={() => navigate(-1)} className="p-2 bg-white/50 rounded-full hover:bg-white/80 transition-colors">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <div className="flex items-center gap-4 font-bold text-sm sm:text-lg text-gray-800">
          <button 
            title={isMuted ? 'Unmute' : 'Mute'} 
            aria-label={isMuted ? 'Unmute' : 'Mute'} 
            onClick={() => setIsMuted(!isMuted)} 
            className="p-2 bg-white/50 rounded-full hover:bg-white/80 transition-colors text-gray-700"
          >
            {isMuted ? <SpeakerSlash size={20} /> : <SpeakerHigh size={20} />}
          </button>
          <div className="bg-white/60 px-4 py-1.5 rounded-full shadow-sm">Best: {highScore}</div>
          <div className="bg-white/60 px-4 py-1.5 rounded-full shadow-sm">Score: {score}</div>
          <div className="bg-white/60 px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1 hidden sm:flex">
            Lives: 
            {[...Array(3)].map((_, i) => (
              <ShoppingCart key={i} size={16} weight="fill" className={i < lives ? 'text-brand-500' : 'text-gray-300'} />
            ))}
          </div>
        </div>
      </div>

      {/* Game Canvas */}
      <div 
        ref={canvasRef}
        onPointerDown={handlePointerMove}
        onPointerMove={handlePointerMove}
        className="relative flex-1 w-full max-w-2xl mx-auto border-x border-white/20 touch-none"
      >
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-6 text-brand-400">
              <ShoppingCart size={48} weight="duotone" />
            </div>
            <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Cart Catch</h1>
            <p className="text-gray-800 font-medium mb-8 max-w-xs">
              Looks like you're offline! Catch the products in your cart, but avoid the broken boxes. 
              Drag the cart or use Arrow Keys.
            </p>
            <button onClick={startGame} className="btn-primary flex items-center gap-2 text-lg px-8 py-4">
              <Play size={20} weight="fill" /> Start Game
            </button>
          </div>
        )}

        {isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-white/40 backdrop-blur-md">
            <h1 className="text-5xl font-display font-bold text-gray-900 mb-2">Game Over</h1>
            <p className="text-2xl font-bold text-gray-900 mb-2">Final Score: {score}</p>
            {score >= highScore && score > 0 && (
              <p className="text-xl font-bold text-amber-500 mb-6 animate-pulse">New High Score! 🏆</p>
            )}
            <button onClick={startGame} className="btn-primary flex items-center gap-2 text-lg px-8 py-4 mt-4 shadow-xl shadow-brand-500/20">
              Play Again
            </button>
          </div>
        )}

        {/* Falling Items */}
        {items.map(item => {
          const Icon = item.icon
          return (
            <div 
              key={item.id}
              className={`absolute w-12 h-12 -ml-6 -mt-6 flex items-center justify-center rounded-2xl shadow-lg ${
                item.type === 'good' ? 'bg-white text-brand-500' : 'bg-red-500 text-white'
              }`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
              }}
            >
              <Icon size={28} weight={item.type === 'bad' ? 'fill' : 'duotone'} />
            </div>
          )
        })}

        {/* Player Cart */}
        <div 
          className="absolute bottom-[10%] w-20 h-20 -ml-10 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-brand-100 z-10 transition-transform"
          style={{ left: `${cartX}%` }}
        >
          <ShoppingCart size={36} weight="duotone" className="text-gray-800" />
        </div>
        
        {/* Floor */}
        <div className="absolute bottom-0 left-0 right-0 h-[10%] bg-white/30 backdrop-blur-md border-t border-white/40" />
      </div>
    </div>
  )
}
