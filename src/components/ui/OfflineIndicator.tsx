import { useEffect, useState } from 'react'
import { WifiSlash } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * Thin amber banner that slides in whenever the browser reports offline. Uses
 * the navigator.onLine signal plus the online/offline events so it flips back
 * the moment connectivity returns. Sits above the bottom nav on mobile so it
 * doesn't fight the cart/wishlist tabs for attention.
 */
export default function OfflineIndicator() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          key="offline-banner"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-6 z-40 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-amber-500/95 text-white text-xs font-semibold shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] border border-amber-400/40 backdrop-blur"
        >
          <WifiSlash size={14} weight="fill" />
          You're offline — showing cached products.
        </motion.div>
      )}
    </AnimatePresence>
  )
}
