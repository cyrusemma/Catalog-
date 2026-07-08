import { useEffect, useState, useRef } from 'react'
import { Megaphone, X, ArrowRight } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStoreSettings } from '../../hooks/useStoreSettings'

export default function AnnouncementBanner() {
  const settings = useStoreSettings()
  const navigate = useNavigate()
  const [showPopup, setShowPopup] = useState(false)
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)
  
  const progressRef = useRef<HTMLDivElement>(null)

  const activeText = settings.announcement_text?.trim() || ''
  const seenKey = activeText ? `announcement-seen-${btoa(activeText)}` : ''

  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.width = `${progress}%`
    }
  }, [progress])

  // Reset progress when announcement changes
  useEffect(() => {
    if (settings.announcement_active && activeText) {
      const isSeen = localStorage.getItem(seenKey)
      if (!isSeen) {
        setProgress(100)
      }
    }
  }, [activeText, seenKey, settings.announcement_active])

  // Timer logic with pause support
  useEffect(() => {
    if (!settings.announcement_active || !activeText) {
      setShowPopup(false)
      return
    }

    const isSeen = localStorage.getItem(seenKey)
    if (isSeen) {
      setShowPopup(false)
      return
    }

    setShowPopup(true)

    // Pause countdown on hover
    if (isPaused) return

    const duration = 8000 // 8 seconds
    const intervalTime = 50
    const decrement = (intervalTime / duration) * 100

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(timer)
          handleDismiss()
          return 0
        }
        return prev - decrement
      })
    }, intervalTime)

    return () => clearInterval(timer)
  }, [settings.announcement_active, activeText, isPaused, seenKey])

  const handleDismiss = () => {
    setShowPopup(false)
    if (seenKey) {
      localStorage.setItem(seenKey, 'true')
      // Dispatch an event to update the notification bell's badge status
      window.dispatchEvent(new Event('announcement-dismissed'))
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // If clicking close button, do nothing
    if ((e.target as HTMLElement).closest('.dismiss-button')) {
      return
    }

    if (settings.announcement_link) {
      if (settings.announcement_link.startsWith('http')) {
        window.open(settings.announcement_link, '_blank', 'noopener,noreferrer')
      } else {
        navigate(settings.announcement_link)
      }
    }
  }

  if (!settings.announcement_active || !activeText) return null

  const megaphoneVariants = {
    animate: {
      rotate: [0, -10, 10, -10, 10, 0],
      transition: {
        delay: 0.5,
        duration: 0.6,
        ease: 'easeInOut' as any,
        repeat: Infinity,
        repeatDelay: 5
      }
    }
  }

  return (
    <AnimatePresence>
      {showPopup && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%', scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
          exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onClick={handleCardClick}
          className={`fixed top-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md bg-white/80 dark:bg-dark-900/90 backdrop-blur-md border border-cream-200/50 dark:border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden group transition-all duration-300 ${
            settings.announcement_link 
              ? 'cursor-pointer hover:border-brand-400/40 hover:shadow-[0_20px_40px_-10px_rgba(212,130,10,0.15)] dark:hover:shadow-[0_20px_40px_-10px_rgba(212,130,10,0.3)] hover:scale-[1.01] active:scale-[0.99]' 
              : ''
          }`}
        >
          <div className="p-4 pr-10 flex items-start gap-3">
            <motion.span 
              variants={megaphoneVariants}
              animate="animate"
              className="w-8 h-8 rounded-lg bg-brand-400/10 text-brand-400 flex items-center justify-center flex-shrink-0"
            >
              <Megaphone size={16} weight="fill" />
            </motion.span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-brand-400 uppercase tracking-wider">Special Announcement</p>
              <p className="text-sm font-semibold text-dark-800 dark:text-white mt-1 leading-snug">
                {activeText}
              </p>
              {settings.announcement_link && (
                <div
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-400 group-hover:text-brand-500 mt-2 transition-colors"
                >
                  View Details <ArrowRight size={12} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleDismiss()
            }}
            aria-label="Dismiss announcement"
            className="dismiss-button absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-dark-800/40 dark:text-white/40 hover:text-dark-800 dark:hover:text-white hover:bg-dark-800/5 dark:hover:bg-white/10 transition-colors"
          >
            <X size={12} weight="bold" />
          </button>

          {/* Shrinking progress line at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-cream-100 dark:bg-white/5">
            <div
              ref={progressRef}
              className="h-full bg-brand-400 transition-all duration-[50ms] ease-linear"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
