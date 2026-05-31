import { useEffect, useRef, useState } from 'react'
import { Bell, Users, X } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { useVisitorCount } from '../../hooks/useVisitorCount'
import { useCustomerSession } from '../../hooks/useCustomerSession'
import { useSignInStore } from '../../store/signInStore'

const SIGNIN_DISMISSED_KEY = 'catalog-signin-prompt-seen-v1'

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString()
}

/**
 * Notification bell in the Navbar. The single home for in-product
 * notifications:
 *   - A "Stay in the loop" sign-in card for guests who haven't dismissed it
 *   - The visitor counter (when the admin has enabled show_visitor_count)
 *   - More notification types will plug in here later (push, new arrivals...)
 *
 * The bell only renders when there's actually something to show — clean
 * navbar for stores that haven't enabled anything. A pulsing dot signals
 * actionable items (currently: the sign-in prompt).
 */
export default function NotificationButton() {
  const settings = useStoreSettings()
  const { data: count } = useVisitorCount(settings.show_visitor_count)
  const { isLoggedIn, loading: sessionLoading } = useCustomerSession()
  const openSignIn = useSignInStore(s => s.openModal)
  const [open, setOpen] = useState(false)
  const [signInDismissed, setSignInDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return !!window.localStorage.getItem(SIGNIN_DISMISSED_KEY)
  })
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const showSignInCard = !sessionLoading && !isLoggedIn && !signInDismissed
  const showVisitorCard = settings.show_visitor_count

  // Hide the bell entirely when there's literally nothing to surface — saves
  // navbar space for stores that haven't enabled any of this.
  if (!showSignInCard && !showVisitorCard) return null

  const dismissSignIn = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SIGNIN_DISMISSED_KEY, '1')
    }
    setSignInDismissed(true)
  }

  const handleSignIn = () => {
    dismissSignIn()
    setOpen(false)
    openSignIn('Sign in to save favourites and get notified about new arrivals.')
  }

  // Only pulse when there's something the user can *act* on. The visitor
  // counter is informational, not a notification — no nag for it.
  const hasUnreadAction = showSignInCard
  const total = count ?? 0

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
        aria-haspopup="menu"
        className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-brand-400/10 transition-colors text-dark-800 dark:text-white"
      >
        <Bell size={18} weight="duotone" />
        {hasUnreadAction && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-400 ring-2 ring-cream-50 dark:ring-dark-900 animate-pulse"
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            role="menu"
            className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-cream-200 dark:border-white/10 bg-white/95 dark:bg-dark-800/95 backdrop-blur-2xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.4)] p-3 space-y-2"
          >
            <div className="flex items-center justify-between px-2 pt-1">
              <p className="text-sm font-semibold text-dark-800 dark:text-white">Notifications</p>
              {hasUnreadAction && (
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-brand-400">New</span>
              )}
            </div>

            {/* Stay in the loop — only for guests who haven't dismissed it. */}
            {showSignInCard && (
              <div className="relative rounded-xl bg-gradient-to-br from-brand-400/15 to-brand-500/10 border border-brand-400/25 p-3 pr-9">
                <button
                  type="button"
                  onClick={dismissSignIn}
                  aria-label="Dismiss"
                  className="absolute top-2 right-2 w-6 h-6 rounded-full text-dark-800/45 dark:text-white/45 hover:text-dark-800 dark:hover:text-white hover:bg-dark-800/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X size={11} weight="bold" />
                </button>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center shadow-amber-glow">
                    <Bell size={15} weight="fill" className="text-white" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-dark-800 dark:text-white leading-tight">Stay in the loop</p>
                    <p className="text-[12px] text-dark-800/65 dark:text-white/60 leading-snug mt-1">
                      Sign in to save favourites and get notified about new arrivals.
                    </p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button
                        type="button"
                        onClick={handleSignIn}
                        className="bg-brand-400 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Sign in
                      </button>
                      <button
                        type="button"
                        onClick={dismissSignIn}
                        className="text-dark-800/55 dark:text-white/55 hover:text-dark-800 dark:hover:text-white text-xs font-medium px-1.5 py-1.5 transition-colors"
                      >
                        Not now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Visitor counter card — admin-toggleable, informational. */}
            {showVisitorCard && (
              <div className="flex items-center gap-3 rounded-xl bg-cream-100 dark:bg-white/5 px-3 py-2.5">
                <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center">
                  <Users size={14} weight="fill" className="text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-dark-800/55 dark:text-white/50">
                    Visitors so far
                  </p>
                  <p className="text-lg font-bold text-dark-800 dark:text-white tabular-nums leading-tight mt-0.5">
                    {formatCount(total)}
                  </p>
                </div>
              </div>
            )}

            <p className="text-[10px] text-dark-800/40 dark:text-white/35 leading-snug px-2 pb-1">
              More notification types are on the way — new-arrival pings, deal alerts, and more.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
