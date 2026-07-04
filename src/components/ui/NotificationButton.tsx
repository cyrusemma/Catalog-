import { useEffect, useRef, useState } from 'react'
import { Bell, X, BellRinging, BellSlash, Sparkle, ArrowRight } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { useCustomerSession } from '../../hooks/useCustomerSession'
import { useSignInStore } from '../../store/signInStore'
import { supabase } from '../../lib/supabase'
import { getActiveSubscription, pushIsSupported, subscribeToPush, unsubscribeFromPush } from '../../lib/pushSubscription'
import { useStoreSettings } from '../../hooks/useStoreSettings'

const SIGNIN_DISMISSED_KEY = 'catalog-signin-prompt-seen-v1'

/**
 * Notification bell in the Navbar. The single home for in-product
 * notifications:
 *   - A "Stay in the loop" sign-in card for guests who haven't dismissed it
 *   - Push subscription controls for signed-in users
 *
 * The bell only renders when there's actually something to show — clean
 * navbar otherwise. A pulsing dot signals actionable items.
 */
export default function NotificationButton() {
  const { isLoggedIn, loading: sessionLoading, user, profile } = useCustomerSession()
  const openSignIn = useSignInStore(s => s.openModal)
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [signInDismissed, setSignInDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return !!window.localStorage.getItem(SIGNIN_DISMISSED_KEY)
  })
  const rootRef = useRef<HTMLDivElement>(null)

  // Browser-side push subscription state. We check on mount and whenever the
  // signed-in user changes, so the UI reflects "already subscribed" without
  // re-prompting permission.
  const [pushSubscribed, setPushSubscribed] = useState<boolean | null>(null)
  const [pushWorking, setPushWorking] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)

  const settings = useStoreSettings()
  const [announcementSeen, setAnnouncementSeen] = useState(true)

  const activeAnnouncementText = settings.announcement_text?.trim() || ''
  const announcementSeenKey = activeAnnouncementText ? `announcement-seen-${btoa(activeAnnouncementText)}` : ''

  useEffect(() => {
    if (!activeAnnouncementText) return
    const checkSeen = () => {
      setAnnouncementSeen(!!localStorage.getItem(announcementSeenKey))
    }
    checkSeen()
    window.addEventListener('announcement-dismissed', checkSeen)
    return () => window.removeEventListener('announcement-dismissed', checkSeen)
  }, [activeAnnouncementText, announcementSeenKey])

  useEffect(() => {
    if (open && settings.announcement_active && !announcementSeen && announcementSeenKey) {
      localStorage.setItem(announcementSeenKey, 'true')
      setAnnouncementSeen(true)
      window.dispatchEvent(new Event('announcement-dismissed'))
    }
  }, [open, settings.announcement_active, announcementSeen, announcementSeenKey])

  useEffect(() => {
    let active = true
    if (!isLoggedIn || !pushIsSupported()) {
      setPushSubscribed(null)
      return
    }
    getActiveSubscription().then(sub => {
      if (active) setPushSubscribed(!!sub)
    })
    return () => { active = false }
  }, [isLoggedIn])

  const handleSubscribePush = async () => {
    if (!user) return
    setPushError(null)
    setPushWorking(true)
    try {
      const sub = await subscribeToPush(user.id)
      if (!sub) {
        setPushError('Notifications were blocked. Enable them in your browser settings to receive new-arrival alerts.')
        setPushSubscribed(false)
        return
      }
      // Best effort: keep profile flag in sync where that column exists.
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ notify_new_arrivals: true })
        .eq('id', user.id)
      if (!profileErr) {
        qc.invalidateQueries({ queryKey: ['customer-profile'] })
      }
      setPushSubscribed(true)
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Could not subscribe.')
    } finally {
      setPushWorking(false)
    }
  }

  const handleUnsubscribePush = async () => {
    if (!user) return
    setPushError(null)
    setPushWorking(true)
    try {
      await unsubscribeFromPush(user.id)
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ notify_new_arrivals: false })
        .eq('id', user.id)
      if (!profileErr) {
        qc.invalidateQueries({ queryKey: ['customer-profile'] })
      }
      setPushSubscribed(false)
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Could not unsubscribe.')
    } finally {
      setPushWorking(false)
    }
  }

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
  const showPushCard = !sessionLoading && isLoggedIn && pushIsSupported()

  // Hide the bell entirely when there's literally nothing to surface — saves
  // navbar space for stores that haven't enabled any of this.
  if (!showSignInCard && !showPushCard) return null

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
  // counter is informational, not a notification — no nag for it. Push gets
  // a pulse only when the user could turn it on but hasn't yet AND the
  // profile flag suggests they want it (the toggle is on but the device isn't
  // subscribed).
  const pushWantedButOff = showPushCard && profile?.notify_new_arrivals === true && pushSubscribed === false
  const hasUnreadAction = showSignInCard || pushWantedButOff || (settings.announcement_active && !announcementSeen)

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
            className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+4rem)] z-50 w-auto max-h-[70dvh] overflow-y-auto rounded-2xl border border-cream-200 dark:border-white/10 bg-white/95 dark:bg-dark-800/95 backdrop-blur-2xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.4)] p-3 space-y-2 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80 sm:max-h-none sm:overflow-visible"
          >
            <div className="flex items-center justify-between px-2 pt-1">
              <p className="text-sm font-semibold text-dark-800 dark:text-white">Notifications</p>
              {hasUnreadAction && (
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-brand-400">New</span>
              )}
            </div>

            {/* Store Announcement card */}
            {settings.announcement_active && settings.announcement_text?.trim() && (
              <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-brand-500/5 border border-brand-400/20 p-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-sm">
                    <Sparkle size={15} weight="fill" className="text-white" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-dark-800 dark:text-white uppercase tracking-wider">Announcement</p>
                    <p className="text-[12px] text-dark-800/75 dark:text-white/70 leading-relaxed mt-1 font-medium">
                      {settings.announcement_text}
                    </p>
                    {settings.announcement_link && (
                      <a
                        href={settings.announcement_link}
                        target={settings.announcement_link.startsWith('http') ? '_blank' : undefined}
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-400 hover:text-brand-500 mt-2 transition-colors"
                      >
                        Learn more <ArrowRight size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

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

            {/* Push notifications — subscribe / unsubscribe for new arrivals. */}
            {showPushCard && (
              <div className="rounded-xl bg-cream-100 dark:bg-white/5 p-3">
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                    pushSubscribed ? 'bg-gradient-to-br from-brand-400 to-brand-500 shadow-amber-glow' : 'bg-dark-800/10 dark:bg-white/10'
                  }`}>
                    {pushSubscribed ? (
                      <BellRinging size={15} weight="fill" className="text-white" />
                    ) : (
                      <BellSlash size={15} weight="duotone" className="text-dark-800/55 dark:text-white/55" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-dark-800 dark:text-white leading-tight">New-arrival alerts</p>
                    <p className="text-[12px] text-dark-800/60 dark:text-white/55 leading-snug mt-1">
                      {pushSubscribed === null
                        ? 'Checking your device…'
                        : pushSubscribed
                          ? 'Subscribed on this device. We\'ll ping you when a new product drops.'
                          : 'Tap to get a notification on this device when new products drop.'}
                    </p>
                    {pushError && (
                      <p className="text-[11px] text-red-500 mt-1.5 leading-snug">{pushError}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2.5">
                      {pushSubscribed ? (
                        <button
                          type="button"
                          onClick={handleUnsubscribePush}
                          disabled={pushWorking}
                          className="bg-dark-800/10 dark:bg-white/10 hover:bg-dark-800/15 dark:hover:bg-white/15 text-dark-800 dark:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                        >
                          {pushWorking ? 'Working…' : 'Turn off'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSubscribePush}
                          disabled={pushWorking || pushSubscribed === null}
                          className="bg-brand-400 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                        >
                          {pushWorking ? 'Working…' : 'Turn on'}
                        </button>
                      )}
                    </div>
                  </div>
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
