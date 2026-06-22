import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Palette,
  Check,
  BellRinging,
  BellSlash,
  SignOut,
  UserCircle,
  EnvelopeSimple,
  Sparkle,
  SlidersHorizontal,
  WhatsappLogo,
  InstagramLogo,
  TiktokLogo,
  FacebookLogo,
  CaretRight,
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { COLOR_THEMES, useThemeStore } from '../store/themeStore'
import { useCustomerSession } from '../hooks/useCustomerSession'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useSignInStore } from '../store/signInStore'
import CurrencySelector from '../components/ui/CurrencySelector'
import {
  getActiveSubscription,
  pushIsSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/pushSubscription'

const sectionMotion = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
})

/** Turn a stored social value (handle or full URL) into a clickable link. */
function socialUrl(value: string, base: string): string {
  const v = value.trim()
  if (/^https?:\/\//i.test(v)) return v
  return base + v.replace(/^@/, '')
}

export default function Settings() {
  const color = useThemeStore(s => s.color)
  const setColor = useThemeStore(s => s.setColor)
  const mode = useThemeStore(s => s.mode)
  const setMode = useThemeStore(s => s.setMode)
  const { isLoggedIn, user, profile } = useCustomerSession()
  const settings = useStoreSettings()
  const openSignIn = useSignInStore(s => s.openModal)
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Browser-side push state — mirrors the navbar bell so this page can manage
  // the same subscription without re-prompting.
  const [pushSubscribed, setPushSubscribed] = useState<boolean | null>(null)
  const [pushWorking, setPushWorking] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)

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

  const handleTogglePush = async () => {
    if (!user) return
    setPushError(null)
    setPushWorking(true)
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush(user.id)
        await supabase.from('profiles').update({ notify_new_arrivals: false }).eq('id', user.id)
        setPushSubscribed(false)
      } else {
        const sub = await subscribeToPush(user.id)
        if (!sub) {
          setPushError('Notifications were blocked. Enable them in your browser settings to receive alerts.')
          setPushSubscribed(false)
          return
        }
        await supabase.from('profiles').update({ notify_new_arrivals: true }).eq('id', user.id)
        setPushSubscribed(true)
      }
      qc.invalidateQueries({ queryKey: ['customer-profile'] })
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Could not update notifications.')
    } finally {
      setPushWorking(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const initials = (profile?.display_name || profile?.email || '?')
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || '?'

  const contactLinks = [
    settings.whatsapp_number && {
      label: 'WhatsApp',
      value: settings.whatsapp_number,
      href: `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`,
      Icon: WhatsappLogo,
    },
    settings.social_instagram && {
      label: 'Instagram',
      value: settings.social_instagram,
      href: socialUrl(settings.social_instagram, 'https://instagram.com/'),
      Icon: InstagramLogo,
    },
    settings.social_tiktok && {
      label: 'TikTok',
      value: settings.social_tiktok,
      href: socialUrl(settings.social_tiktok, 'https://tiktok.com/@'),
      Icon: TiktokLogo,
    },
    settings.social_facebook && {
      label: 'Facebook',
      value: settings.social_facebook,
      href: socialUrl(settings.social_facebook, 'https://facebook.com/'),
      Icon: FacebookLogo,
    },
  ].filter(Boolean) as { label: string; value: string; href: string; Icon: typeof WhatsappLogo }[]

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 pb-28 lg:pb-10">
      <div className="flex items-center gap-2 mb-2">
        <Sparkle size={14} weight="fill" className="text-brand-400" />
        <span className="text-brand-400 text-xs font-bold uppercase tracking-[0.2em]">Preferences</span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-display font-bold text-dark-800 dark:text-white mb-8 flex items-center gap-3">
        <SlidersHorizontal size={28} weight="duotone" className="text-brand-400" />
        Settings
      </h1>

      {/* Theme switcher — full grid of every theme. */}
      <motion.section
        {...sectionMotion(0)}
        className="rounded-3xl bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 p-5 sm:p-6 mb-5"
      >
        <div className="flex items-center gap-2 mb-1">
          <Palette size={18} weight="duotone" className="text-brand-400" />
          <h2 className="text-dark-800 dark:text-white font-semibold">Appearance</h2>
        </div>
        <p className="text-dark-800/55 dark:text-white/50 text-sm mb-4">
          Choose a colour theme. Switch between light and dark from the navbar. Saved to this device.
        </p>

        {/* Colour theme */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dark-800/50 dark:text-white/40 mb-2">Colour</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
          {COLOR_THEMES.map(t => {
            const active = t.value === color
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setColor(t.value)}
                aria-pressed={active}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all ${
                  active
                    ? 'bg-brand-400/10 ring-2 ring-brand-400/40'
                    : 'bg-cream-100 dark:bg-white/5 ring-1 ring-transparent hover:ring-brand-400/20'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex-shrink-0 w-8 h-8 rounded-lg ring-1 ring-black/10 dark:ring-white/10"
                  style={{ background: t.swatch }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-sm font-medium text-dark-800 dark:text-white truncate">
                    {t.label}
                    {active && <Check size={13} weight="bold" className="text-brand-400 flex-shrink-0" />}
                  </span>
                  <span className="block text-[11px] text-dark-800/50 dark:text-white/40 truncate">
                    {t.subtitle}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {/* Light / dark */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-dark-800/50 dark:text-white/40 mb-2">Mode</p>
        <div className="inline-flex rounded-2xl bg-cream-100 dark:bg-white/5 p-1">
          {(['light', 'dark'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`px-5 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${
                mode === m
                  ? 'bg-brand-400 text-white shadow-sm'
                  : 'text-dark-800/60 dark:text-white/55 hover:text-dark-800 dark:hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
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
            <div className="inline-block bg-cream-100 dark:bg-dark-700 rounded-xl px-2">
              <CurrencySelector />
            </div>
          </div>
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
                : !pushIsSupported()
                  ? 'Push notifications aren\'t available here. On iPhone, add the app to your home screen first, then come back.'
                  : pushSubscribed === null
                    ? 'Checking this device…'
                    : pushSubscribed
                      ? 'On — we\'ll ping this device when a new product goes live.'
                      : 'Off — turn on to get notified the moment new products drop.'}
            </p>
            {pushError && <p className="text-red-500 text-xs mt-2">{pushError}</p>}
          </div>

          {isLoggedIn && pushIsSupported() ? (
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={pushWorking || pushSubscribed === null}
              aria-pressed={!!pushSubscribed}
              aria-label="Toggle new-arrival notifications"
              className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${
                pushSubscribed ? 'bg-brand-400' : 'bg-cream-200 dark:bg-dark-700'
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  pushSubscribed ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
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

      {/* Contact & store info. */}
      <motion.section
        {...sectionMotion(0.15)}
        className="rounded-3xl bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 p-5 sm:p-6"
      >
        <h2 className="text-dark-800 dark:text-white font-semibold">{settings.store_name}</h2>
        <p className="text-dark-800/55 dark:text-white/50 text-sm mt-1 mb-4">{settings.tagline}</p>
        {contactLinks.length > 0 ? (
          <div className="space-y-2">
            {contactLinks.map(({ label, value, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl bg-cream-100 dark:bg-white/5 hover:bg-cream-200 dark:hover:bg-white/10 px-3 py-2.5 transition-colors"
              >
                <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center">
                  <Icon size={16} weight="fill" className="text-white" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-dark-800 dark:text-white">{label}</span>
                  <span className="block text-[11px] text-dark-800/50 dark:text-white/40 truncate">{value}</span>
                </span>
                <CaretRight size={14} weight="bold" className="text-dark-800/30 dark:text-white/30 flex-shrink-0" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-dark-800/45 dark:text-white/35 text-sm">No contact channels configured yet.</p>
        )}
      </motion.section>
    </main>
  )
}
