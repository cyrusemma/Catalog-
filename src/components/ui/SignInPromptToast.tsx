import { useEffect, useState } from 'react'
import { Bell, X } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCustomerSession } from '../../hooks/useCustomerSession'
import { useSignInStore } from '../../store/signInStore'

const SEEN_KEY = 'catalog-signin-prompt-seen-v1'
const DELAY_MS = 15_000

/**
 * Soft sign-in nudge that slides up from the bottom after the visitor has
 * been on the site for ~15 seconds. Skips if they're already signed in or
 * have dismissed it before — once a device has been asked, we don't ask
 * again. The whole thing replaces the old full-screen welcome popup with
 * something more functional: this directly funnels into the auth + push
 * pipeline rather than just being decorative.
 */
export default function SignInPromptToast() {
  const [open, setOpen] = useState(false)
  const { isLoggedIn, loading } = useCustomerSession()
  const openSignIn = useSignInStore(s => s.openModal)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (loading) return
    if (isLoggedIn) return
    if (window.localStorage.getItem(SEEN_KEY)) return

    const id = window.setTimeout(() => setOpen(true), DELAY_MS)
    return () => window.clearTimeout(id)
  }, [isLoggedIn, loading])

  // Hide instantly the moment a guest becomes a member, even if the toast was
  // already on screen — they just signed in via Navbar or the modal.
  useEffect(() => {
    if (isLoggedIn && open) setOpen(false)
  }, [isLoggedIn, open])

  const remember = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SEEN_KEY, '1')
    }
  }

  const dismiss = () => {
    remember()
    setOpen(false)
  }

  const handleSignIn = () => {
    remember()
    setOpen(false)
    openSignIn('Sign in to save favourites and get notified about new arrivals.')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="signin-prompt-toast"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          // Sits above the mobile bottom-nav (bottom-24) and the visitor chip
          // never collides because the chip is bottom-right while we're
          // bottom-centre.
          className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-6 z-40 w-[calc(100vw-1.5rem)] max-w-md"
          role="status"
          aria-live="polite"
        >
          <div className="relative flex items-start gap-3 rounded-2xl bg-dark-800/95 dark:bg-dark-800/95 border border-brand-400/30 backdrop-blur-xl shadow-[0_18px_50px_-20px_rgba(0,0,0,0.7)] p-4 pr-10">
            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center shadow-amber-glow">
              <Bell size={18} weight="fill" className="text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-sm leading-tight">Stay in the loop</p>
              <p className="text-white/65 text-[12px] sm:text-xs leading-snug mt-1">
                Sign in to save favourites and get notified about new arrivals.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="bg-brand-400 hover:bg-brand-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-white/55 hover:text-white text-xs font-medium px-2 py-1.5 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full text-white/55 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X size={13} weight="bold" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
