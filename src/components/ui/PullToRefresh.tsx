import { useState, useRef } from 'react'
import type { ReactNode } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { ArrowDown, Spinner } from '@phosphor-icons/react'

interface Props {
  onRefresh: () => Promise<void>
  children: ReactNode
}

export default function PullToRefresh({ onRefresh, children }: Props) {
  const [pullDist, setPullDist] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const controls = useAnimation()
  
  const maxPull = 120
  const triggerDist = 70

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only pull if we are at the very top
    if (window.scrollY > 0) return
    startY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY > 0 || startY.current === 0) return
    const y = e.touches[0].clientY
    const dy = y - startY.current
    if (dy > 0) {
      // Add resistance
      const pull = Math.min(dy * 0.5, maxPull)
      setPullDist(pull)
      controls.set({ y: pull })
    }
  }

  const handleTouchEnd = async () => {
    if (pullDist > triggerDist && !refreshing) {
      setRefreshing(true)
      controls.start({ y: triggerDist, transition: { type: 'spring', stiffness: 300, damping: 20 } })
      await onRefresh()
      setRefreshing(false)
      controls.start({ y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } })
    } else {
      controls.start({ y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } })
    }
    setPullDist(0)
    startY.current = 0
  }

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full"
    >
      {/* Background indicator */}
      <div className="absolute top-0 left-0 right-0 h-24 flex flex-col items-center justify-end pb-4 -z-10 pointer-events-none">
        {refreshing ? (
          <Spinner size={24} className="animate-spin text-brand-400" />
        ) : (
          <motion.div animate={{ rotate: pullDist > triggerDist ? 180 : 0 }}>
            <ArrowDown size={24} className="text-brand-400/50 transition-colors" style={{ opacity: Math.min(pullDist / 40, 1) }} />
          </motion.div>
        )}
      </div>

      {/* Foreground content sliding down */}
      <motion.div animate={controls} className="w-full h-full bg-cream-50 dark:bg-dark-900">
        {children}
      </motion.div>
    </div>
  )
}
