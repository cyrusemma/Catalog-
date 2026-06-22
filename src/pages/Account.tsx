import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, BellSlash, SignOut, User as UserIcon, EnvelopeSimple, CheckCircle, Sparkle, Storefront, ArrowSquareOut } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCustomerSession } from '../hooks/useCustomerSession'

export default function Account() {
  const { isLoggedIn, user, profile, loading } = useCustomerSession()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [savingNotify, setSavingNotify] = useState(false)
  const [notifyError, setNotifyError] = useState('')
  const [signedOut, setSignedOut] = useState(false)
  const [showCreateWizard, setShowCreateWizard] = useState(false)

  // Redirect to home if we end up here without a session. Wait for the auth
  // check to settle so we don't bounce a user who's mid-sign-in.
  useEffect(() => {
    if (!loading && !isLoggedIn && !signedOut) {
      navigate('/', { replace: true })
    }
  }, [loading, isLoggedIn, signedOut, navigate])

  // Fetch the logged-in user's store
  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['user-store', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user?.id)
        .maybeSingle()
      
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  const toggleNotify = async () => {
    if (!profile || !user) return
    setNotifyError('')
    setSavingNotify(true)
    const next = !profile.notify_new_arrivals
    const { error } = await supabase
      .from('profiles')
      .update({ notify_new_arrivals: next })
      .eq('id', user.id)
    setSavingNotify(false)
    if (error) {
      setNotifyError(error.message)
      return
    }
    qc.invalidateQueries({ queryKey: ['customer-profile'] })
  }

  const signOut = async () => {
    setSignedOut(true)
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  if (loading || !profile) {
    return (
      <main className="w-full flex-1 max-w-3xl mx-auto px-4 py-12 pb-28 lg:pb-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 bg-cream-100 dark:bg-dark-700 rounded" />
          <div className="h-32 bg-cream-100 dark:bg-dark-700 rounded-3xl" />
          <div className="h-24 bg-cream-100 dark:bg-dark-700 rounded-3xl" />
        </div>
      </main>
    )
  }

  const initials = (profile.display_name || profile.email || '?')
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || '?'

  return (
    <main className="w-full flex-1 max-w-3xl mx-auto px-4 py-10 pb-28 lg:pb-10">
      <div className="flex items-center gap-2 mb-2">
        <Sparkle size={14} weight="fill" className="text-brand-400" />
        <span className="text-brand-400 text-xs font-bold uppercase tracking-[0.2em]">Your account</span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-display font-bold text-dark-800 dark:text-white mb-8">Account</h1>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 p-5 sm:p-6 mb-5"
      >
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-14 h-14 rounded-full object-cover ring-2 ring-brand-400/30"
            />
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
      </motion.section>

      {/* Store Setup / Manager Card */}
      {!storeLoading && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 p-5 sm:p-6 mb-5"
        >
          {store ? (
            <div className="flex items-start gap-3">
              <Storefront size={18} weight="duotone" className="text-brand-400 mt-0.5" />
              <div className="flex-1">
                <h2 className="text-dark-800 dark:text-white font-semibold">Your Store: {store.name}</h2>
                <p className="text-dark-800/55 dark:text-white/50 text-sm mt-1.5">
                  You are a registered merchant! Manage products, check orders, and view sales stats.
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <Link
                    to="/admin"
                    className="text-brand-400 hover:text-brand-500 text-sm font-semibold"
                  >
                    Go to Admin Dashboard →
                  </Link>
                  <a
                    href={`/s/${store.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-dark-800/60 dark:text-white/55 hover:text-brand-400 text-sm font-semibold flex items-center gap-1"
                  >
                    View Storefront <ArrowSquareOut size={13} />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {showCreateWizard ? (
                <StoreCreationWizard
                  onCancel={() => setShowCreateWizard(false)}
                  onSuccess={() => {
                    setShowCreateWizard(false)
                    qc.invalidateQueries({ queryKey: ['user-store', user?.id] })
                  }}
                />
              ) : (
                <div className="flex items-start gap-3">
                  <Storefront size={18} weight="duotone" className="text-brand-400 mt-0.5" />
                  <div className="flex-1">
                    <h2 className="text-dark-800 dark:text-white font-semibold">Start Selling</h2>
                    <p className="text-dark-800/55 dark:text-white/50 text-sm mt-1.5">
                      Create your own storefront in minutes, upload products, and share your link to start selling.
                    </p>
                    <button
                      onClick={() => setShowCreateWizard(true)}
                      className="mt-3 bg-brand-400 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm"
                    >
                      Create Storefront
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 p-5 sm:p-6 mb-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {profile.notify_new_arrivals ? (
                <Bell size={18} weight="fill" className="text-brand-400" />
              ) : (
                <BellSlash size={18} weight="duotone" className="text-dark-800/40 dark:text-white/40" />
              )}
              <h2 className="text-dark-800 dark:text-white font-semibold">New-arrival notifications</h2>
            </div>
            <p className="text-dark-800/55 dark:text-white/50 text-sm mt-1.5">
              Get a push notification whenever a new product goes live. We'll only ping you about real new arrivals — not promos or noise.
            </p>
            {notifyError && <p className="text-red-500 text-xs mt-2">{notifyError}</p>}
          </div>
          <button
            type="button"
            onClick={toggleNotify}
            disabled={savingNotify}
            aria-pressed={profile.notify_new_arrivals}
            aria-label="Toggle new-arrival notifications"
            className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${
              profile.notify_new_arrivals ? 'bg-brand-400' : 'bg-cream-200 dark:bg-dark-700'
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                profile.notify_new_arrivals ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {profile.notify_new_arrivals && (
          <p className="text-green-600 dark:text-green-400 text-xs font-medium mt-3 inline-flex items-center gap-1">
            <CheckCircle size={12} weight="fill" /> You'll be notified about new arrivals
          </p>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 p-5 sm:p-6 mb-5"
      >
        <div className="flex items-start gap-3">
          <UserIcon size={18} weight="duotone" className="text-brand-400 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-dark-800 dark:text-white font-semibold">Saved items</h2>
            <p className="text-dark-800/55 dark:text-white/50 text-sm mt-1.5">
              Your wishlist lives in your browser right now. Synced wishlist across devices is coming soon — once that ships, your local items will offer to migrate into your account.
            </p>
            <Link
              to="/wishlist"
              className="inline-block mt-3 text-brand-400 hover:text-brand-500 text-sm font-semibold"
            >
              Open wishlist →
            </Link>
          </div>
        </div>
      </motion.section>

      <button
        type="button"
        onClick={signOut}
        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 text-red-500 hover:bg-red-500/10 px-4 py-3 text-sm font-semibold transition-colors"
      >
        <SignOut size={16} weight="bold" /> Sign out
      </button>
    </main>
  )
}

// ─── Multi-Step Store Creation Wizard ─────────────────────────────────────────

const CURRENCIES = ['GHS', 'USD', 'GBP', 'EUR', 'NGN', 'KES', 'ZAR']

function StoreCreationWizard({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const { user } = useCustomerSession()
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [tagline, setTagline] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [currency, setCurrency] = useState('GHS')

  // Slug availability
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugTimer, setSlugTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleNameChange = (val: string) => {
    setName(val)
    const generated = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
    setSlug(generated)
    checkSlug(generated)
  }

  const handleSlugChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(clean)
    checkSlug(clean)
  }

  const checkSlug = (value: string) => {
    setSlugAvailable(null)
    if (slugTimer) clearTimeout(slugTimer)
    if (!value || value.length < 3) return
    setSlugChecking(true)
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', value)
        .maybeSingle()
      setSlugAvailable(!data)
      setSlugChecking(false)
    }, 500)
    setSlugTimer(t)
  }

  const canProceedStep1 = name.trim().length >= 2 && slug.length >= 3 && slugAvailable === true
  const canProceedStep2 = whatsapp.trim().replace(/\D/g, '').length >= 7

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const { error: insertError } = await supabase.from('stores').insert({
        name: name.trim(),
        slug: slug.trim(),
        tagline: tagline.trim() || null,
        whatsapp_number: whatsapp.trim().replace(/\D/g, ''),
        currency,
        owner_id: user?.id,
      })
      if (insertError) throw insertError
      setDone(true)
      setTimeout(onSuccess, 4000)
    } catch (err: any) {
      setError(err.message || 'Failed to create store. Please try again.')
      setLoading(false)
    }
  }

  // ── Success state ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center py-6 space-y-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
          className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg"
        >
          <CheckCircle size={32} weight="fill" className="text-white" />
        </motion.div>
        <div>
          <h3 className="text-dark-800 dark:text-white font-bold text-lg">🎉 Your store is live!</h3>
          <p className="text-dark-800/55 dark:text-white/50 text-sm mt-1">
            <span className="font-semibold text-brand-400">{name}</span> is ready to go.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Link
            to="/admin"
            className="bg-brand-400 hover:bg-brand-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            Go to Admin Dashboard →
          </Link>
          <a
            href={`/s/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="border border-cream-200 dark:border-white/10 text-dark-800 dark:text-white/80 hover:border-brand-400/40 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5"
          >
            View Storefront <ArrowSquareOut size={13} />
          </a>
        </div>
      </motion.div>
    )
  }

  const steps = ['Identity', 'Contact', 'Review']

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-dark-800 dark:text-white text-base">Create Your Storefront</h3>
          <p className="text-xs text-dark-800/45 dark:text-white/35 mt-0.5">Step {step} of 3 — {steps[step - 1]}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-dark-800/40 dark:text-white/30 hover:text-dark-800/70 dark:hover:text-white/60 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Step progress bar */}
      <div className="flex items-center gap-1.5">
        {steps.map((_s, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
            i + 1 <= step ? 'bg-brand-400' : 'bg-cream-200 dark:bg-dark-600'
          }`} />
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium border border-red-200 dark:border-red-800/30">
          {error}
        </div>
      )}

      {/* ── Step 1: Identity ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <motion.div
          key="step1"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-800/60 dark:text-white/45 mb-1.5">
              Store Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Aura Styles"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              className="w-full bg-cream-100 dark:bg-dark-700 border border-cream-200 dark:border-white/10 focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-800/60 dark:text-white/45 mb-1.5">
              Store URL <span className="text-red-400">*</span>
            </label>
            <div className={`flex items-center bg-cream-100 dark:bg-dark-700 border rounded-xl px-3 py-2.5 text-sm transition-all ${
              slug.length >= 3
                ? slugAvailable === true ? 'border-green-400/60' : slugAvailable === false ? 'border-red-400/60' : 'border-cream-200 dark:border-white/10'
                : 'border-cream-200 dark:border-white/10'
            }`}>
              <span className="text-dark-800/35 dark:text-white/30 text-xs mr-1 flex-shrink-0">{window.location.host}/s/</span>
              <input
                type="text"
                required
                placeholder="aura-styles"
                value={slug}
                onChange={e => handleSlugChange(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none p-0 text-sm min-w-0"
              />
              <span className="ml-2 flex-shrink-0 w-4 text-center">
                {slugChecking && (
                  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
                )}
                {!slugChecking && slug.length >= 3 && slugAvailable === true && (
                  <span className="text-green-500 text-xs font-bold">✓</span>
                )}
                {!slugChecking && slug.length >= 3 && slugAvailable === false && (
                  <span className="text-red-400 text-xs font-bold">✗</span>
                )}
              </span>
            </div>
            {slug.length >= 3 && !slugChecking && slugAvailable === false && (
              <p className="text-red-400 text-xs mt-1">This URL is already taken. Try another.</p>
            )}
            {slug.length >= 3 && !slugChecking && slugAvailable === true && (
              <p className="text-green-500 text-xs mt-1">Available ✓</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-800/60 dark:text-white/45 mb-1.5">
              Tagline <span className="text-dark-800/30 dark:text-white/25 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Your go-to for streetwear"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              maxLength={80}
              className="w-full bg-cream-100 dark:bg-dark-700 border border-cream-200 dark:border-white/10 focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
              className="bg-brand-400 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
            >
              Next: Contact →
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Step 2: Contact ──────────────────────────────────────────────────── */}
      {step === 2 && (
        <motion.div
          key="step2"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-800/60 dark:text-white/45 mb-1.5">
              WhatsApp Number <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-dark-800/45 dark:text-white/35 mb-2">
              Customers will message you here to place orders. Include country code — e.g. <span className="font-mono">233574090147</span>.
            </p>
            <input
              type="tel"
              required
              placeholder="233574090147"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              className="w-full bg-cream-100 dark:bg-dark-700 border border-cream-200 dark:border-white/10 focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-800/60 dark:text-white/45 mb-1.5">
              Currency
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CURRENCIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    currency === c
                      ? 'bg-brand-400 text-white border-brand-400 shadow-sm'
                      : 'bg-cream-100 dark:bg-dark-700 text-dark-800/60 dark:text-white/50 border-cream-200 dark:border-white/10 hover:border-brand-400/40'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-dark-800/50 dark:text-white/40 hover:text-dark-800/80 dark:hover:text-white/70 font-semibold transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={!canProceedStep2}
              onClick={() => setStep(3)}
              className="bg-brand-400 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
            >
              Review →
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Step 3: Review ───────────────────────────────────────────────────── */}
      {step === 3 && (
        <motion.div
          key="step3"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div className="bg-cream-50 dark:bg-dark-700/50 border border-cream-200 dark:border-white/8 rounded-2xl p-4 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-dark-800/45 dark:text-white/30 mb-3">Your store details</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <span className="text-dark-800/50 dark:text-white/40 text-xs">Store Name</span>
              <span className="font-semibold text-dark-800 dark:text-white text-xs">{name}</span>

              <span className="text-dark-800/50 dark:text-white/40 text-xs">URL</span>
              <span className="font-mono text-brand-400 text-xs truncate">/s/{slug}</span>

              {tagline && <>
                <span className="text-dark-800/50 dark:text-white/40 text-xs">Tagline</span>
                <span className="text-dark-800 dark:text-white text-xs italic truncate">"{tagline}"</span>
              </>}

              <span className="text-dark-800/50 dark:text-white/40 text-xs">WhatsApp</span>
              <span className="text-dark-800 dark:text-white text-xs">+{whatsapp.replace(/\D/g, '')}</span>

              <span className="text-dark-800/50 dark:text-white/40 text-xs">Currency</span>
              <span className="font-bold text-dark-800 dark:text-white text-xs">{currency}</span>
            </div>
          </div>

          <p className="text-xs text-dark-800/40 dark:text-white/30">
            You can update all of these from your Admin Dashboard → Settings at any time.
          </p>

          <div className="flex justify-between pt-1">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm text-dark-800/50 dark:text-white/40 hover:text-dark-800/80 dark:hover:text-white/70 font-semibold transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="bg-brand-400 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-xl text-sm transition-colors shadow-sm flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Launching...
                </>
              ) : (
                '🚀 Launch Store'
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
