import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, TShirt, DeviceMobile, Sneaker, Handbag, XCircle, ArrowLeft, Play } from '@phosphor-icons/react'

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
  const [lives, setLives] = useState(3)
  
  const [cartX, setCartX] = useState(50) // percentage 0-100
  const [items, setItems] = useState<FallingItem[]>([])

  // Game loop refs to avoid dependency staleness
  const reqRef = useRef<number>()
  const stateRef = useRef({
    isPlaying,
    cartX,
    items,
    score,
    lives,
    lastSpawn: 0
  })

  useEffect(() => {
    stateRef.current = { isPlaying, cartX, items, score, lives, lastSpawn: stateRef.current.lastSpawn }
  }, [isPlaying, cartX, items, score, lives])

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
            } else {
              newLives -= 1
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

      if (newLives <= 0) {
        setIsGameOver(true)
        setIsPlaying(false)
        setLives(0)
      } else {
        setItems(newItems)
        setScore(newScore)
        setLives(newLives)
        reqRef.current = requestAnimationFrame(loop)
      }
    }

    reqRef.current = requestAnimationFrame(loop)
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current)
    }
  }, [isPlaying])

  const startGame = () => {
    setScore(0)
    setLives(3)
    setItems([])
    setIsGameOver(false)
    setIsPlaying(true)
    stateRef.current.lastSpawn = performance.now()
  }

  return (
    <div className="fixed inset-0 z-50 bg-brand-50 flex flex-col font-sans overflow-hidden select-none">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-100 via-pink-100 to-brand-50 opacity-70" />
      
      {/* Header */}
      <div className="relative z-10 p-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 bg-white/50 rounded-full hover:bg-white/80 transition-colors">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <div className="flex items-center gap-6 font-bold text-lg text-gray-800">
          <div className="bg-white/60 px-4 py-1.5 rounded-full shadow-sm">Score: {score}</div>
          <div className="bg-white/60 px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1">
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
            <p className="text-gray-600 mb-8 max-w-xs">
              Looks like you're offline! Catch the products in your cart, but avoid the broken boxes. 
              Drag the cart or use Arrow Keys.
            </p>
            <button onClick={startGame} className="btn-primary flex items-center gap-2 text-lg px-8 py-4">
              <Play size={20} weight="fill" /> Start Game
            </button>
          </div>
        )}

        {isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-white/40 backdrop-blur-sm">
            <h1 className="text-5xl font-display font-bold text-gray-900 mb-2">Game Over</h1>
            <p className="text-2xl font-bold text-brand-500 mb-8">Final Score: {score}</p>
            <button onClick={startGame} className="btn-primary flex items-center gap-2 text-lg px-8 py-4 shadow-xl shadow-brand-500/20">
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
