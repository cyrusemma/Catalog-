import { useState } from 'react'
import { X, GoogleLogo, EnvelopeSimple, CheckCircle, Eye, EyeSlash, LockKey } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'

interface Props {
  open: boolean
  onClose: () => void
  /** Optional copy shown above the sign-in options — e.g. "Sign in to save favourites". */
  reason?: string
}

type Tab = 'password' | 'magic'

/**
 * Single sign-in surface for customers. Three paths:
 *  - Google OAuth (requires the provider to be enabled in Supabase Auth)
 *  - Email + password (sign in OR sign up; signup sends a confirmation email)
 *  - Magic link (passwordless; one-time link in email)
 *
 * The modal closes itself on a successful "check your email" state for
 * signup/magic-link; Google + password sign-in either navigate away or close
 * once the auth state changes.
 */
export default function SignInModal({ open, onClose, reason }: Props) {
  const [tab, setTab] = useState<Tab>('password')
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [working, setWorking] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'info'; title: string; body: string } | null>(null)
  const [error, setError] = useState('')

  const reset = () => {
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setWorking(false)
    setNotice(null)
    setError('')
    setMode('signin')
    setTab('password')
  }

  const close = () => {
    reset()
    onClose()
  }

  // After OAuth / magic-link confirmation, Supabase redirects back to this
  // exact URL with `?code=...`. Keeping the user on whatever page they were
  // signing in from feels more natural than punting them home.
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : undefined

  const signInWithGoogle = async () => {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) {
      setError(
        error.message.toLowerCase().includes('provider')
          ? 'Google sign-in is not enabled yet. Use email below, or ask the site admin to turn on Google in Supabase Auth.'
          : error.message,
      )
    }
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanedEmail = email.trim().toLowerCase()
    if (!cleanedEmail || !cleanedEmail.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setError('')
    setWorking(true)

    if (mode === 'signup') {
      // Signup. Supabase will send a confirmation email; the user can't sign
      // in until they click the link.
      const { error } = await supabase.auth.signUp({
        email: cleanedEmail,
        password,
        options: { emailRedirectTo: redirectTo },
      })
      setWorking(false)
      if (error) {
        setError(humanizeAuthError(error.message))
        return
      }
      setNotice({
        kind: 'info',
        title: 'Confirm your email',
        body: `We sent a confirmation link to ${cleanedEmail}. Click it to activate your account, then come back and sign in.`,
      })
      return
    }

    // Sign in
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanedEmail,
      password,
    })
    setWorking(false)
    if (error) {
      setError(humanizeAuthError(error.message))
      return
    }
    // Supabase has set the session; auth state change will propagate. Close.
    close()
  }

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = email.trim().toLowerCase()
    if (!cleaned || !cleaned.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    setWorking(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: cleaned,
      options: { emailRedirectTo: redirectTo },
    })
    setWorking(false)
    if (error) {
      setError(humanizeAuthError(error.message))
      return
    }
    setNotice({
      kind: 'success',
      title: 'Check your email',
      body: `We sent a sign-in link to ${cleaned}. Tap it on this device to finish signing in.`,
    })
  }

  const submitForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanedEmail = email.trim().toLowerCase()
    if (!cleanedEmail || !cleanedEmail.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    setWorking(true)
    setError('')

    const resetUrl = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(cleanedEmail, {
      redirectTo: resetUrl,
    })
    setWorking(false)
    if (error) {
      setError(humanizeAuthError(error.message))
      return
    }
    setNotice({
      kind: 'info',
      title: 'Reset link sent',
      body: `We sent a password reset link to ${cleanedEmail}. Click it to choose a new password.`,
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="signin-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          // Same backdrop pattern as WelcomePopup: full-viewport fixed cover,
          // flex-centre the modal in it. Scrolling happens inside the modal so
          // the dim layer never goes anywhere.
          className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/70 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Sign in"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            // max-h + flex column lets the content area scroll inside the
            // rounded frame when the modal is taller than the viewport, while
            // the close button stays pinned and the glow blobs keep clipping
            // to the corners.
            className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl bg-gradient-to-br from-dark-800 via-dark-900 to-black border border-brand-400/25 shadow-[0_40px_120px_-30px_rgba(212,130,10,0.45)] overflow-hidden"
          >
            <div className="pointer-events-none absolute -top-24 -right-20 w-[320px] h-[320px] bg-brand-400/20 rounded-full blur-3xl" />

            <button
              type="button"
              onClick={close}
              aria-label="Close sign-in"
              className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors"
            >
              <X size={16} weight="bold" />
            </button>

            <div className="relative px-6 sm:px-7 pt-8 pb-6 overflow-y-auto">
              <h2 className="text-2xl font-display font-bold text-white">
                {mode === 'signup' ? 'Create your account' : 'Sign in'}
              </h2>
              <p className="text-white/55 text-sm mt-1.5">
                {reason || 'Save your favourites and get notified about new arrivals.'}
              </p>

              {notice ? (
                <div className="mt-6 rounded-2xl bg-green-500/10 border border-green-500/30 px-4 py-5 text-center">
                  <CheckCircle size={28} weight="fill" className="text-green-400 mx-auto mb-2" />
                  <p className="text-white font-semibold">{notice.title}</p>
                  <p className="text-white/60 text-sm mt-1">{notice.body}</p>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-4 text-brand-400 hover:text-brand-300 text-sm font-semibold"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {mode !== 'forgot' && (
                    <>
                      <button
                        type="button"
                        onClick={signInWithGoogle}
                        className="mt-6 w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-white text-dark-900 font-semibold py-3 hover:bg-white/90 transition-colors"
                      >
                        <GoogleLogo size={18} weight="bold" />
                        Continue with Google
                      </button>

                      <div className="flex items-center gap-3 my-5 text-white/35 text-xs uppercase tracking-[0.24em]">
                        <span className="flex-1 h-px bg-white/10" />
                        or with email
                        <span className="flex-1 h-px bg-white/10" />
                      </div>

                      {/* Tab switcher — password is the default since the user
                          explicitly asked for it; magic link is the lightweight
                          backup for people who don't want to remember one. */}
                      <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 mb-4">
                        <button
                          type="button"
                          onClick={() => { setTab('password'); setError('') }}
                          className={`text-xs font-semibold py-2 rounded-xl transition-colors ${
                            tab === 'password'
                              ? 'bg-brand-400 text-white shadow-sm'
                              : 'text-white/55 hover:text-white'
                          }`}
                        >
                          Password
                        </button>
                        <button
                          type="button"
                          onClick={() => { setTab('magic'); setError('') }}
                          className={`text-xs font-semibold py-2 rounded-xl transition-colors ${
                            tab === 'magic'
                              ? 'bg-brand-400 text-white shadow-sm'
                              : 'text-white/55 hover:text-white'
                          }`}
                        >
                          Magic link
                        </button>
                      </div>
                    </>
                  )}

                  {mode === 'forgot' ? (
                    <form onSubmit={submitForgotPassword} className="space-y-4">
                      <label className="block text-white/55 text-[10px] uppercase tracking-[0.24em] font-semibold">Email</label>
                      <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 focus-within:border-brand-400/60 px-3 py-2.5">
                        <EnvelopeSimple size={16} className="text-white/55" />
                        <input
                          name="email"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          autoComplete="email"
                          required
                          className="flex-1 bg-transparent text-white placeholder-white/35 text-sm outline-none"
                        />
                      </div>
                      {error && <p className="text-red-300 text-xs">{error}</p>}
                      <button
                        type="submit"
                        disabled={working}
                        className="w-full bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold py-3 rounded-2xl transition-colors"
                      >
                        {working ? 'Sending Link…' : 'Send Reset Link'}
                      </button>
                      <p className="text-center text-white/45 text-[11px]">
                        Remembered your password?{' '}
                        <button
                          type="button"
                          onClick={() => { setMode('signin'); setError('') }}
                          className="text-brand-400 hover:text-brand-300 font-semibold"
                        >
                          Sign in
                        </button>
                      </p>
                    </form>
                  ) : tab === 'password' ? (
                    <form onSubmit={submitPassword} className="space-y-3">
                      <label className="block text-white/55 text-[10px] uppercase tracking-[0.24em] font-semibold">Email</label>
                      <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 focus-within:border-brand-400/60 px-3 py-2.5">
                        <EnvelopeSimple size={16} className="text-white/55" />
                        <input
                          name="email"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          autoComplete="email"
                          required
                          className="flex-1 bg-transparent text-white placeholder-white/35 text-sm outline-none"
                        />
                      </div>

                      <label className="block text-white/55 text-[10px] uppercase tracking-[0.24em] font-semibold pt-1">
                        Password {mode === 'signup' && <span className="text-white/35 normal-case tracking-normal">(at least 6 characters)</span>}
                      </label>
                      <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 focus-within:border-brand-400/60 px-3 py-2.5">
                        <LockKey size={16} className="text-white/55" />
                        {mode === 'signup' ? (
                          <input
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Pick a strong one"
                            autoComplete="new-password"
                            required
                            minLength={6}
                            className="flex-1 bg-transparent text-white placeholder-white/35 text-sm outline-none"
                          />
                        ) : (
                          <input
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                            minLength={6}
                            className="flex-1 bg-transparent text-white placeholder-white/35 text-sm outline-none"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword(s => !s)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="text-white/55 hover:text-white/80"
                        >
                          {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {mode === 'signin' && (
                        <div className="flex justify-end -mt-1 pb-1">
                          <button
                            type="button"
                            onClick={() => { setMode('forgot'); setError('') }}
                            className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
                          >
                            Forgot password?
                          </button>
                        </div>
                      )}

                      {mode === 'signup' && password.length > 0 && (
                        <div className="space-y-3 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          {/* Strength Bar */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Strength:</span>
                            <div className="flex-1 flex gap-1 h-1.5">
                              {[1, 2, 3, 4, 5].map(step => {
                                const score = getPasswordStrength(password)
                                const active = step <= score
                                let bgClass = 'bg-white/10'
                                if (active) {
                                  bgClass = score <= 2 ? 'bg-red-500' : score <= 4 ? 'bg-amber-500' : 'bg-emerald-500'
                                }
                                return (
                                  <div
                                    key={step}
                                    className={`flex-1 h-full rounded-full transition-colors duration-300 ${bgClass}`}
                                  />
                                )
                              })}
                            </div>
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                              getPasswordStrength(password) <= 2 ? 'text-red-400' : getPasswordStrength(password) <= 4 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {getPasswordStrength(password) <= 2 ? 'Weak' : getPasswordStrength(password) <= 4 ? 'Medium' : 'Strong!'}
                            </span>
                          </div>

                          {/* Requirements Checklist */}
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 bg-white/5 rounded-2xl p-3 border border-white/5 text-[11px] text-left">
                            <div className="flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                                password.length >= 6 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'border-white/20 text-white/40'
                              }`}>
                                <span className="text-[8px] font-bold">✓</span>
                              </div>
                              <span className={password.length >= 6 ? 'text-emerald-400 font-semibold' : 'text-white/55'}>Min 6 characters</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                                /[A-Z]/.test(password) ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'border-white/20 text-white/40'
                              }`}>
                                <span className="text-[8px] font-bold">✓</span>
                              </div>
                              <span className={/[A-Z]/.test(password) ? 'text-emerald-400 font-semibold' : 'text-white/55'}>1 Uppercase letter</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                                /[0-9]/.test(password) ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'border-white/20 text-white/40'
                              }`}>
                                <span className="text-[8px] font-bold">✓</span>
                              </div>
                              <span className={/[0-9]/.test(password) ? 'text-emerald-400 font-semibold' : 'text-white/55'}>1 Number (0-9)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                                /[^a-zA-Z0-9]/.test(password) ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'border-white/20 text-white/40'
                              }`}>
                                <span className="text-[8px] font-bold">✓</span>
                              </div>
                              <span className={/[^a-zA-Z0-9]/.test(password) ? 'text-emerald-400 font-semibold' : 'text-white/55'}>1 Special symbol</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {error && <p className="text-red-300 text-xs">{error}</p>}

                      <button
                        type="submit"
                        disabled={working}
                        className="w-full bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold py-3 rounded-2xl transition-colors"
                      >
                        {working ? (mode === 'signup' ? 'Creating…' : 'Signing in…') : (mode === 'signup' ? 'Create account' : 'Sign in')}
                      </button>

                      <p className="text-center text-white/45 text-[11px]">
                        {mode === 'signin' ? (
                          <>
                            New here?{' '}
                            <button
                              type="button"
                              onClick={() => { setMode('signup'); setError('') }}
                              className="text-brand-400 hover:text-brand-300 font-semibold"
                            >
                              Create an account
                            </button>
                          </>
                        ) : (
                          <>
                            Already have an account?{' '}
                            <button
                              type="button"
                              onClick={() => { setMode('signin'); setError('') }}
                              className="text-brand-400 hover:text-brand-300 font-semibold"
                            >
                              Sign in instead
                            </button>
                          </>
                        )}
                      </p>
                    </form>
                  ) : (
                    <form onSubmit={sendMagicLink} className="space-y-3">
                      <label className="block text-white/55 text-[10px] uppercase tracking-[0.24em] font-semibold">Email</label>
                      <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 focus-within:border-brand-400/60 px-3 py-2.5">
                        <EnvelopeSimple size={16} className="text-white/55" />
                        <input
                          name="email"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          autoComplete="email"
                          required
                          className="flex-1 bg-transparent text-white placeholder-white/35 text-sm outline-none"
                        />
                      </div>
                      {error && <p className="text-red-300 text-xs">{error}</p>}
                      <button
                        type="submit"
                        disabled={working}
                        className="w-full bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold py-3 rounded-2xl transition-colors"
                      >
                        {working ? 'Sending…' : 'Send sign-in link'}
                      </button>
                      <p className="text-white/40 text-[11px] text-center">
                        We'll email you a one-click link — no password needed.
                      </p>
                    </form>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Translate Supabase's developer-facing error strings into something a
 * customer can actually act on. Falls through to the original message for
 * anything we haven't seen before.
 */
function humanizeAuthError(raw: string): string {
  const m = raw.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Wrong email or password. Try again, or create an account.'
  if (m.includes('email not confirmed')) return "Please confirm your email first — check your inbox for the link we sent."
  if (m.includes('user already registered')) return 'An account with that email already exists. Sign in instead.'
  if (m.includes('rate limit')) return "Too many tries. Wait a minute and try again."
  if (m.includes('signups not allowed')) return 'New signups are disabled by the admin.'
  return raw
}

function getPasswordStrength(p: string): number {
  let score = 0
  if (!p) return 0
  if (p.length >= 6) score += 1
  if (p.length >= 8) score += 1
  if (/[A-Z]/.test(p)) score += 1
  if (/[0-9]/.test(p)) score += 1
  if (/[^a-zA-Z0-9]/.test(p)) score += 1
  return score
}
