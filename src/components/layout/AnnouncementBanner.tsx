import { useEffect, useState } from 'react'
import { Sparkle, X, ArrowRight } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStoreSettings } from '../../hooks/useStoreSettings'

export default function AnnouncementBanner() {
  const settings = useStoreSettings()
  const [showPopup, setShowPopup] = useState(false)
  const [progress, setProgress] = useState(100)

  const activeText = settings.announcement_text?.trim() || ''
  const seenKey = activeText ? `announcement-seen-${btoa(activeText)}` : ''

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
    setProgress(100)

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
  }, [settings.announcement_active, activeText])

  const handleDismiss = () => {
    setShowPopup(false)
    if (seenKey) {
      localStorage.setItem(seenKey, 'true')
      // Dispatch an event to update the notification bell's badge status
      window.dispatchEvent(new Event('announcement-dismissed'))
    }
  }

  if (!settings.announcement_active || !activeText) return null

  return (
    <AnimatePresence>
      {showPopup && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%', scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
          exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
          style={{ left: '50%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="fixed top-4 z-[100] w-[calc(100%-2rem)] max-w-md bg-white/75 dark:bg-dark-900/80 backdrop-blur-md border border-cream-200/50 dark:border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden"
        >
          <div className="p-4 pr-10 flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
              <Sparkle size={16} weight="fill" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Special Announcement</p>
              <p className="text-sm font-semibold text-dark-800 dark:text-white mt-1 leading-snug">
                {activeText}
              </p>
              {settings.announcement_link && (
                <a
                  href={settings.announcement_link}
                  target={settings.announcement_link.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-500 mt-2 transition-colors"
                >
                  View Details <ArrowRight size={12} weight="bold" />
                </a>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss announcement"
            className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-dark-800/40 dark:text-white/40 hover:text-dark-800 dark:hover:text-white hover:bg-dark-800/5 dark:hover:bg-white/10 transition-colors"
          >
            <X size={12} weight="bold" />
          </button>

          {/* Shrinking progress line at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-cream-100 dark:bg-white/5">
            <div
              className="h-full bg-brand-400 transition-all ease-linear"
              style={{ width: `${progress}%`, transitionDuration: '50ms' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
