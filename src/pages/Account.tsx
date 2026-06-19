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
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 pb-28 lg:pb-12">
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
    <main className="flex-1 max-w-3xl mx-auto px-4 py-10 pb-28 lg:pb-10">
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

function StoreCreationWizard({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const { user } = useCustomerSession()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleNameChange = (val: string) => {
    setName(val)
    const generated = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
    setSlug(generated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setError('')
    setLoading(true)

    try {
      const { data: existing } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      if (existing) {
        throw new Error('This store URL is already taken. Please choose another.')
      }

      const { error: insertError } = await supabase
        .from('stores')
        .insert({
          name: name.trim(),
          slug: slug.trim(),
          owner_id: user?.id,
        })

      if (insertError) throw insertError

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to create store')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="font-semibold text-dark-800 dark:text-white text-base">Setup Your Store</h3>
        <p className="text-xs text-dark-800/50 dark:text-white/40 mt-1">Configure your new storefront details.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-dark-800/65 dark:text-white/50 mb-1.5">
          Store Name
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Aura Styles"
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          className="w-full bg-cream-100 dark:bg-dark-700 border border-cream-200 dark:border-white/10 focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 rounded-xl px-3 py-2 text-sm outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-dark-800/65 dark:text-white/50 mb-1.5">
          Store URL Slug
        </label>
        <div className="flex items-center gap-1.5 bg-cream-100 dark:bg-dark-700 border border-cream-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm">
          <span className="text-gray-400 text-xs">/s/</span>
          <input
            type="text"
            required
            placeholder="aura-styles"
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            className="w-full bg-transparent border-none outline-none p-0 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-xl text-xs font-semibold border border-cream-200 dark:border-white/10 text-gray-500 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-400 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Launch Store'}
        </button>
      </div>
    </form>
  )
}
