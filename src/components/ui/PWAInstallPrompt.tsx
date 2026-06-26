import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Share } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if dismissed
    if (localStorage.getItem('pwa_prompt_dismissed')) {
      return
    }

    // Check if already in standalone (installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      return
    }

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    if (isIosDevice) {
      setIsIOS(true)
      // Delay before showing to not be too aggressive
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 5000)
      return () => clearTimeout(timer)
    }

    // Listen for native install prompt (Android/Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Wait a moment before showing
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa_prompt_dismissed', 'true')
    setShowPrompt(false)
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-cream-200 dark:border-white/10 p-5 z-[100] flex flex-col gap-4"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-start gap-4 pr-6">
            <div className="w-12 h-12 bg-brand-50 dark:bg-brand-950/30 rounded-xl flex items-center justify-center flex-shrink-0 text-brand-400">
              <Download size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Add to Home Screen</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                Install our app for a faster, better shopping experience and offline access.
              </p>
            </div>
          </div>

          {isIOS ? (
            <div className="bg-gray-50 dark:bg-dark-900 rounded-xl p-3 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <span className="flex items-center gap-1 font-medium">Tap <Share size={16} className="text-gray-900 dark:text-white" /> then "Add to Home Screen"</span>
            </div>
          ) : (
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-brand-400 text-white hover:bg-brand-500 transition-colors shadow-sm"
              >
                Install App
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
