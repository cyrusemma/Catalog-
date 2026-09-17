import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Palette,
  Check,
  BellRinging,
  BellSlash,
  SignOut,
  UserCircle,
  EnvelopeSimple,
  SlidersHorizontal,
  CaretRight,
  ArrowLeft,
  Sun,
  Moon,
  Desktop,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { COLOR_THEMES, useThemeStore, type Mode } from '../store/themeStore'
import { useCustomerSession } from '../hooks/useCustomerSession'
import { useNotificationPreferences } from '../hooks/useNotificationPreferences'
import { useSignInStore } from '../store/signInStore'
import CurrencySelector from '../components/ui/CurrencySelector'

const sectionMotion = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
})

export default function Settings() {
  const color = useThemeStore(s => s.color)
  const setColor = useThemeStore(s => s.setColor)
  const mode = useThemeStore(s => s.mode)
  const setMode = useThemeStore(s => s.setMode)
  const showDashboardShortcut = useThemeStore(s => s.showDashboardShortcut)
  const setShowDashboardShortcut = useThemeStore(s => s.setShowDashboardShortcut)
  const { isLoggedIn, profile } = useCustomerSession()
  const { pushSubscribed, pushWorking, pushError, supported, toggle } = useNotificationPreferences()
  const openSignIn = useSignInStore(s => s.openModal)
  const navigate = useNavigate()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const handleDeleteAccount = async () => {
    if (!profile || !isLoggedIn) return
    setDeleting(true)
    setDeleteError('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ deletion_requested_at: new Date().toISOString() })
        .eq('id', profile.id)

      if (error) throw error

      toast.success('Account deletion scheduled. You have been signed out.')
      await supabase.auth.signOut()
      navigate('/', { replace: true })
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to request deletion.')
    } finally {
      setDeleting(false)
    }
  }

  const initials = (profile?.display_name || profile?.email || '?')
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || '?'

  const modeOptions: { value: Mode; label: string; icon: any; desc: string }[] = [
    { value: 'light', label: 'Light', icon: Sun, desc: 'Clean daylight theme' },
    { value: 'dark', label: 'Dark', icon: Moon, desc: 'Deep night contrast' },
    { value: 'system', label: 'System', icon: Desktop, desc: 'Syncs with device OS' },
  ]

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 pb-28 lg:pb-12">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream-100/80 dark:bg-dark-800 text-xs font-bold text-dark-800/70 dark:text-white/70 hover:text-brand-400 dark:hover:text-brand-400 mb-5 transition-colors border border-cream-200 dark:border-white/5 active:scale-95"
      >
        <ArrowLeft size={14} weight="bold" />
        <span>Back</span>
      </button>

      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
        <span className="text-brand-400 text-xs font-bold uppercase tracking-[0.2em]">Preferences</span>
      </div>
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-dark-800 dark:text-white mb-6 flex items-center gap-3">
        <SlidersHorizontal size={28} weight="duotone" className="text-brand-400" />
        Settings
      </h1>

      {/* Theme switcher — full grid of every theme. */}
      <motion.section
        {...sectionMotion(0)}
        className="rounded-3xl bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 p-5 sm:p-6 mb-5 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-1">
          <Palette size={18} weight="duotone" className="text-brand-400" />
          <h2 className="text-dark-800 dark:text-white font-semibold">Appearance & Themes</h2>
        </div>
        <p className="text-dark-800/55 dark:text-white/50 text-xs sm:text-sm mb-5">
          Customize your visual palette and theme mode. Your choices are saved and synced locally on this device.
        </p>

        {/* Colour theme 4-column balanced grid */}
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-dark-800/50 dark:text-white/40 mb-2.5">
          Color Palette
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {COLOR_THEMES.map(t => {
            const active = t.value === color
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setColor(t.value)}
                className={`relative flex flex-col p-3 rounded-2xl text-left transition-all duration-200 group active:scale-95 ${
                  active
                    ? 'bg-brand-400/10 ring-2 ring-brand-400/50 dark:ring-brand-400 shadow-sm'
                    : 'bg-cream-100/70 dark:bg-white/5 border border-transparent hover:border-brand-400/20 hover:bg-cream-100 dark:hover:bg-white/10'
                }`}
              >
                {/* Swatch Pill with mini highlight */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    aria-hidden="true"
                    className={`w-9 h-9 rounded-xl ring-1 ring-black/10 dark:ring-white/10 shadow-sm ${t.swatchClass}`}
                  />
                  {active && (
                    <span className="w-5 h-5 rounded-full bg-brand-400 text-white flex items-center justify-center shadow-sm">
                      <Check size={12} weight="bold" />
                    </span>
                  )}
                </div>

                <span className="text-xs font-bold text-dark-800 dark:text-white truncate">
                  {t.label}
                </span>
                <span className="text-[10px] text-dark-800/50 dark:text-white/40 truncate mt-0.5">
                  {t.subtitle}
                </span>
              </button>
            )
          })}
        </div>

        {/* 3-Option Mode Switcher */}
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-dark-800/50 dark:text-white/40 mb-2.5">
          Display Mode
        </p>
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-cream-100/80 dark:bg-dark-900/80 border border-cream-200 dark:border-white/5">
          {modeOptions.map(m => {
            const active = mode === m.value
            const Icon = m.icon
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`relative flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                  active
                    ? 'text-white'
                    : 'text-dark-800/60 dark:text-white/60 hover:text-dark-800 dark:hover:text-white'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeSettingsThemeMode"
                    className="absolute inset-0 bg-brand-400 rounded-xl shadow-sm shadow-brand-400/25"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon size={16} weight={active ? 'fill' : 'bold'} />
                  <span>{m.label}</span>
                </span>
              </button>
            )
          })}
        </div>
      </motion.section>

      {/* Regional preferences. */}
      <motion.section
        {...sectionMotion(0.02)}
        className="rounded-3xl bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 p-5 sm:p-6 mb-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌍</span>
              <h2 className="text-dark-800 dark:text-white font-semibold">Regional Settings</h2>
            </div>
            <p className="text-dark-800/55 dark:text-white/50 text-sm mt-1.5 mb-4">
              Choose your preferred currency to display prices across the store. This setting is saved to your device.
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dark-800/50 dark:text-white/40 mb-2">Display Currency</p>
            <CurrencySelector />
          </div>
        </div>
      </motion.section>

      {/* Shortcut preferences. */}
      <motion.section
        {...sectionMotion(0.03)}
        className="rounded-3xl bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 p-5 sm:p-6 mb-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h2 className="text-dark-800 dark:text-white font-semibold">Quick Shortcuts</h2>
            </div>
            <p className="text-dark-800/55 dark:text-white/50 text-sm mt-1.5">
              Enable the Merchant Dashboard button shortcut directly in your navigation bar. By default, it is hidden to keep the navbar clean.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDashboardShortcut(!showDashboardShortcut)}
            aria-label="Toggle merchant dashboard shortcut in navbar"
            className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${
              showDashboardShortcut ? 'bg-brand-400' : 'bg-cream-200 dark:bg-dark-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                showDashboardShortcut ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </motion.section>

      {/* Notification preferences. */}
      <motion.section
        {...sectionMotion(0.05)}
        className="rounded-3xl bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 p-5 sm:p-6 mb-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {pushSubscribed ? (
                <BellRinging size={18} weight="fill" className="text-brand-400" />
              ) : (
                <BellSlash size={18} weight="duotone" className="text-dark-800/40 dark:text-white/40" />
              )}
              <h2 className="text-dark-800 dark:text-white font-semibold">New-arrival alerts</h2>
            </div>
            <p className="text-dark-800/55 dark:text-white/50 text-sm mt-1.5">
              {!isLoggedIn
                ? 'Sign in to get a push notification on this device whenever a new product drops.'
                : !supported
                  ? 'Push notifications aren\'t available here. On iPhone, add the app to your home screen first, then come back.'
                  : pushSubscribed === null
                    ? 'Checking this device…'
                    : pushSubscribed
                      ? 'On — we\'ll ping this device when a new product goes live.'
                      : 'Off — turn on to get notified the moment new products drop.'}
            </p>
            {pushError && <p className="text-red-500 text-xs mt-2">{pushError}</p>}
          </div>

          {isLoggedIn && supported ? (
            <button
              type="button"
              onClick={toggle}
              disabled={pushSubscribed === null}
              aria-label="Toggle new-arrival notifications"
              className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                pushSubscribed ? 'bg-brand-400' : 'bg-cream-200 dark:bg-dark-700'
              } ${pushSubscribed === null ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
                  pushSubscribed ? 'translate-x-6' : 'translate-x-1'
                }`}
              >
                {pushWorking && (
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
                )}
              </span>
            </button>
          ) : !isLoggedIn ? (
            <button
              type="button"
              onClick={() => openSignIn('Sign in to get notified about new arrivals.')}
              className="flex-shrink-0 bg-brand-400 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              Sign in
            </button>
          ) : null}
        </div>
      </motion.section>

      {/* Account / profile. */}
      <motion.section
        {...sectionMotion(0.1)}
        className="rounded-3xl bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 p-5 sm:p-6 mb-5"
      >
        {isLoggedIn && profile ? (
          <>
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-brand-400/30" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 text-white font-bold text-lg flex items-center justify-center shadow-amber-glow">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-dark-800 dark:text-white font-semibold truncate">
                  {profile.display_name || 'Signed in'}
                </p>
                <p className="text-dark-800/55 dark:text-white/50 text-sm truncate flex items-center gap-1.5">
                  <EnvelopeSimple size={13} /> {profile.email}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
              <Link
                to="/account"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-cream-100 dark:bg-white/5 hover:bg-cream-200 dark:hover:bg-white/10 px-4 py-3 text-sm font-semibold text-dark-800 dark:text-white transition-colors"
              >
                Manage account <CaretRight size={14} weight="bold" />
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 text-red-500 hover:bg-red-500/10 px-4 py-3 text-sm font-semibold transition-colors"
              >
                <SignOut size={16} weight="bold" /> Sign out
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-cream-100 dark:border-white/5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setDeleteError('')
                  setShowDeleteModal(true)
                }}
                className="text-xs text-red-500/70 hover:text-red-500 hover:underline font-semibold transition-colors"
              >
                Delete Account
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-start gap-3">
            <UserCircle size={20} weight="duotone" className="text-brand-400 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-dark-800 dark:text-white font-semibold">Account</h2>
              <p className="text-dark-800/55 dark:text-white/50 text-sm mt-1.5">
                Sign in to save favourites, manage notifications, and sync your preferences.
              </p>
              <button
                type="button"
                onClick={() => openSignIn('Sign in to manage your account.')}
                className="inline-block mt-3 bg-brand-400 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        )}
      </motion.section>

      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !deleting && setShowDeleteModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white dark:bg-dark-800 rounded-3xl shadow-2xl p-6 overflow-hidden border border-cream-200 dark:border-brand-400/15"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 to-amber-500" />
              
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span>⚠️</span> Request Account Deletion
              </h2>
              
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 my-4 leading-relaxed">
                <p>
                  You are scheduling your account for permanent deletion.
                </p>
                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-3.5 space-y-2 text-xs text-red-500/90 dark:text-red-400/95">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>⏳</span> 14-Day Grace Period
                  </p>
                  <p>
                    Your account will be deactivated immediately and any owned vendor store will be placed in maintenance mode. 
                    You have <strong>14 days</strong> to log back in and cancel this request. After 14 days, your data will be permanently erased.
                  </p>
                </div>
                <p>
                  All active orders, followed stores, gift card balances, and shopping preferences will eventually be lost.
                </p>
              </div>

              {deleteError && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 p-2.5 rounded-xl w-full mb-4">
                  {deleteError}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-cream-100 dark:bg-white/5 hover:bg-cream-200 dark:hover:bg-white/10 text-gray-700 dark:text-white font-semibold py-3 rounded-2xl transition-colors disabled:opacity-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteAccount}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
                >
                  {deleting ? 'Processing...' : 'Confirm Deletion'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  )
}
