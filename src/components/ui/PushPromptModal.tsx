import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BellRing, X, Loader2, Zap, Truck, Tag, ShieldCheck, Flame } from 'lucide-react'
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences'
import { useCustomerSession } from '../../hooks/useCustomerSession'

const PUSH_PROMPT_DISMISSED_KEY = 'catalog-push-prompt-snoozed-at-v2'
const SNOOZE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export default function PushPromptModal() {
  const { isLoggedIn, loading: sessionLoading } = useCustomerSession()
  const { pushSubscribed, pushWorking, pushError, supported, subscribe } = useNotificationPreferences()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (sessionLoading || !isLoggedIn || !supported) return
    if (pushSubscribed === true) return

    const dismissedAt = localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY)
    if (dismissedAt) {
      const timePassed = Date.now() - Number(dismissedAt)
      if (timePassed < SNOOZE_PERIOD_MS) return
    }

    // Show popup politely 2 seconds after customer interaction
    const timer = setTimeout(() => {
      setOpen(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [isLoggedIn, sessionLoading, supported, pushSubscribed])

  const handleDismiss = () => {
    localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, String(Date.now()))
    setOpen(false)
  }

  const handleSubscribe = async () => {
    await subscribe()
    if (!pushError) {
      localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, String(Date.now()))
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
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-dark-900/60 backdrop-blur-sm"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-dark-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden border border-cream-200/80 dark:border-white/10 z-10"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-br from-brand-400/20 via-brand-500/10 to-transparent pointer-events-none" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-400/15 rounded-full blur-2xl pointer-events-none" />

            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 text-dark-800/40 hover:text-dark-800 dark:text-white/40 dark:hover:text-white rounded-full hover:bg-cream-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center mt-1">
              <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-400/30 mb-4 relative">
                <BellRing size={28} className="text-white" />
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-dark-800 rounded-full animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-400/10 dark:bg-brand-400/15 text-brand-500 dark:text-brand-400 text-xs font-bold mb-2">
                <Flame size={13} className="text-amber-500" />
                <span>VIP Member Perk</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-display font-bold text-dark-800 dark:text-white mb-2">
                Never Miss a Drop or Deal
              </h2>
              <p className="text-xs sm:text-sm text-dark-800/60 dark:text-white/60 mb-5 max-w-sm">
                Enable instant phone notifications to stay ahead of private drops, restocks, and delivery updates.
              </p>

              {/* Value Props Grid */}
              <div className="w-full bg-cream-50/70 dark:bg-dark-900/60 border border-cream-200/60 dark:border-white/5 rounded-2xl p-3.5 mb-5 space-y-2.5 text-left">
                <div className="flex items-center gap-2.5 text-xs text-dark-800/80 dark:text-white/80 font-medium">
                  <div className="w-6 h-6 rounded-lg bg-brand-400/15 text-brand-500 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
                    <Zap size={13} />
                  </div>
                  <span>15-minute early access to new collection drops</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-dark-800/80 dark:text-white/80 font-medium">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Truck size={13} />
                  </div>
                  <span>Real-time dispatch & shipping tracking alerts</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-dark-800/80 dark:text-white/80 font-medium">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                    <Tag size={13} />
                  </div>
                  <span>Exclusive subscriber discounts & flash sale promos</span>
                </div>
              </div>

              {pushError && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/30 p-2.5 rounded-xl w-full mb-4 text-center">
                  {pushError}
                </p>
              )}

              <div className="flex flex-col w-full gap-2.5 relative z-10">
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={pushWorking}
                  className="w-full bg-brand-400 hover:bg-brand-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-brand-400/20 flex items-center justify-center gap-2 text-sm"
                >
                  {pushWorking ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Enabling Notifications...</span>
                    </>
                  ) : (
                    <>
                      <BellRing size={16} />
                      <span>Enable Notifications</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full bg-transparent hover:bg-cream-100 dark:hover:bg-dark-700 text-dark-800/60 dark:text-white/50 font-semibold py-2.5 rounded-xl transition-colors text-xs"
                >
                  Remind Me Next Week
                </button>
              </div>

              <div className="flex items-center justify-center gap-1 mt-4 text-[10px] text-dark-800/40 dark:text-white/30">
                <ShieldCheck size={12} />
                <span>Zero spam guarantee. You can turn this off anytime in Settings.</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
