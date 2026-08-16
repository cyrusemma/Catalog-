import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BellRing, X, Loader2 } from 'lucide-react'
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences'
import { useCustomerSession } from '../../hooks/useCustomerSession'

const PUSH_PROMPT_DISMISSED_KEY = 'catalog-push-prompt-seen-v1'

export default function PushPromptModal() {
  const { isLoggedIn, loading: sessionLoading } = useCustomerSession()
  const { pushSubscribed, pushWorking, pushError, supported, subscribe } = useNotificationPreferences()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (sessionLoading || !isLoggedIn || !supported) return
    if (pushSubscribed === true) return

    const hasSeen = localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY)
    if (hasSeen) return

    // Show popup shortly after they log in
    const timer = setTimeout(() => {
      setOpen(true)
    }, 1500)

    return () => clearTimeout(timer)
  }, [isLoggedIn, sessionLoading, supported, pushSubscribed])

  const handleDismiss = () => {
    localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, '1')
    setOpen(false)
  }

  const handleSubscribe = async () => {
    await subscribe()
    if (!pushError) {
      localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, '1')
      setOpen(false)
    }
  }

  // Once they successfully subscribe, close it
  useEffect(() => {
    if (pushSubscribed) {
      setOpen(false)
    }
  }, [pushSubscribed])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-sm bg-white dark:bg-dark-800 rounded-2xl shadow-2xl p-6 overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-brand-400/20 to-transparent pointer-events-none" />

            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-400/30 mb-5 relative">
                <BellRing size={28} className="text-white" />
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-dark-800 rounded-full animate-pulse" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Don't Miss Out!
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Turn on notifications to be the first to know when new products arrive.
              </p>

              {pushError && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg w-full mb-4">
                  {pushError}
                </p>
              )}

              <div className="flex flex-col w-full gap-2 relative z-10">
                <button
                  onClick={handleSubscribe}
                  disabled={pushWorking}
                  className="w-full bg-brand-400 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {pushWorking && <Loader2 size={16} className="animate-spin" />}
                  {pushWorking ? 'Working...' : 'Turn on Notifications'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full bg-gray-50 hover:bg-gray-100 dark:bg-dark-700 dark:hover:bg-dark-600 text-gray-600 dark:text-gray-300 font-medium py-3 rounded-xl transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
