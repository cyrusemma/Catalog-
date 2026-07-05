import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Storefront,
  WhatsappLogo,
  Link as LinkIcon,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  InstagramLogo,
  FacebookLogo,
  TiktokLogo,
  Image,
  Star,
  ShieldCheck,
  CurrencyCircleDollar,
  Lightning,
} from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import { formatPhoneNumber } from '../lib/utils'
import { useSignInStore } from '../store/signInStore'

const BENEFITS = [
  {
    Icon: CurrencyCircleDollar,
    title: 'Zero upfront cost',
    desc: 'Create your store for free. No monthly fees to get started.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    Icon: LinkIcon,
    title: 'Your own store link',
    desc: 'Get a unique shareable link: marketplace.com/s/your-shop',
    color: 'text-brand-400',
    bg: 'bg-brand-400/10',
  },
  {
    Icon: WhatsappLogo,
    title: 'WhatsApp order alerts',
    desc: 'Every order notification lands in your WhatsApp inbox instantly.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    Icon: ShieldCheck,
    title: 'Admin-backed approval',
    desc: 'Get your products featured in the main marketplace after review.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    Icon: Lightning,
    title: 'Flash sales & features',
    desc: 'Run time-limited deals and feature products in your storefront.',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    Icon: Star,
    title: 'Product reviews',
    desc: 'Customers leave ratings. You approve what shows publicly.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
]

const BUSINESS_CATEGORIES = [
  'Fashion & Apparel',
  'Electronics & Tech',
  'Beauty & Cosmetics',
  'Home & Decor',
  'Food & Groceries',
  'Jewelry & Accessories',
  'Sports & Fitness',
  'Art & Crafts',
  'Books & Stationery',
  'Other',
]

export default function BecomeMerchant() {
  const navigate = useNavigate()
  const openSignIn = useSignInStore(s => s.openModal)
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState(1) // 1 = Benefits, 2 = Store details, 3 = Contact & socials
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Step 2 fields
  const [storeName, setStoreName] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [businessCategory, setBusinessCategory] = useState('Fashion & Apparel')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  // Step 3 fields
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [tiktokHandle, setTiktokHandle] = useState('')
  const [facebookHandle, setFacebookHandle] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
    })
  }, [])

  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const handleStoreNameChange = (val: string) => {
    setStoreName(val)
    if (!slugManuallyEdited) {
      setStoreSlug(autoSlug(val))
    }
  }

  const handleSlugChange = (val: string) => {
    setStoreSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    setSlugManuallyEdited(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!storeName || !storeSlug || !whatsappNumber) {
      setError('Please fill in all required fields.')
      return
    }
    if (!/^[a-z0-9-]+$/.test(storeSlug)) {
      setError('Store URL can only contain lowercase letters, numbers, and hyphens.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { error: insertError } = await supabase.from('stores').insert({
        name: storeName,
        slug: storeSlug,
        tagline: tagline || null,
        description: description || null,
        business_category: businessCategory,
        whatsapp_number: formatPhoneNumber(whatsappNumber),
        social_instagram: instagramHandle ? `https://instagram.com/${instagramHandle.replace(/^@/, '')}` : null,
        social_tiktok: tiktokHandle ? `https://tiktok.com/@${tiktokHandle.replace(/^@/, '')}` : null,
        social_facebook: facebookHandle ? `https://facebook.com/${facebookHandle.replace(/^@/, '')}` : null,
        owner_id: user.id,
      })

      if (insertError) {
        if (insertError.code === '23505') {
          setError('That store URL is already taken. Please choose another one.')
        } else {
          setError(insertError.message)
        }
        return
      }

      navigate('/merchant')
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Not signed in ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-4 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-400/10 flex items-center justify-center mb-6 mx-auto">
          <Storefront size={40} weight="duotone" className="text-brand-400" />
        </div>
        <h1 className="text-3xl font-display font-bold text-dark-800 dark:text-white mb-4">
          Become a Seller
        </h1>
        <p className="text-dark-800/60 dark:text-white/60 mb-8 max-w-md">
          Join our marketplace and start selling your products today. Sign in or create an account
          first.
        </p>
        <button onClick={() => openSignIn()} className="btn-primary">
          Sign In to Continue
        </button>
      </main>
    )
  }

  const storeUrl = `${window.location.host}/s/${storeSlug || 'your-shop'}`

  // ── Step indicator ───────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3].map(n => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              n < step
                ? 'bg-brand-400 text-white shadow-amber-glow'
                : n === step
                ? 'bg-brand-400/20 text-brand-400 border-2 border-brand-400'
                : 'bg-cream-100 dark:bg-dark-700 text-dark-800/40 dark:text-white/30'
            }`}
          >
            {n < step ? <CheckCircle size={16} weight="fill" /> : n}
          </div>
          {n < 3 && (
            <div
              className={`h-0.5 w-12 rounded-full transition-all ${
                n < step ? 'bg-brand-400' : 'bg-cream-200 dark:bg-white/10'
              }`}
            />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs text-dark-800/50 dark:text-white/40 font-medium">
        Step {step} of 3
      </span>
    </div>
  )

  // ── Step 1: Benefits ─────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <main className="flex-1 max-w-2xl mx-auto px-4 py-16 w-full">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-brand-100 dark:bg-brand-500/20 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Storefront size={40} weight="duotone" />
          </div>
          <h1 className="text-3xl font-display font-bold text-dark-800 dark:text-white mb-3">
            Open Your Shop
          </h1>
          <p className="text-dark-800/60 dark:text-white/60 max-w-md mx-auto">
            Get your own branded storefront in minutes. Here's everything you get:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {BENEFITS.map(({ Icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="card p-5 flex gap-4 items-start hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={20} weight="duotone" className={color} />
              </div>
              <div>
                <p className="font-semibold text-dark-800 dark:text-white text-sm mb-1">{title}</p>
                <p className="text-xs text-dark-800/55 dark:text-white/45 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setStep(2)}
          className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
        >
          Get Started <ArrowRight size={18} />
        </button>
      </main>
    )
  }

  // ── Step 2: Store Details ────────────────────────────────────────────────
  if (step === 2) {
    return (
      <main className="flex-1 max-w-xl mx-auto px-4 py-16 w-full">
        <StepIndicator />
        <h2 className="text-2xl font-display font-bold text-dark-800 dark:text-white mb-2">
          Store Details
        </h2>
        <p className="text-sm text-dark-800/55 dark:text-white/45 mb-8">
          Set up your storefront identity.
        </p>

        <div className="card p-6 md:p-8 space-y-6">
          {/* Store name */}
          <div>
            <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2">
              Store Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={storeName}
              onChange={e => handleStoreNameChange(e.target.value)}
              placeholder="e.g. Emma's Boutique"
              className="input w-full"
            />
          </div>

          {/* Slug with live preview */}
          <div>
            <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2 flex items-center gap-2">
              <LinkIcon size={16} className="text-brand-400" /> Store URL
              <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-dark-800/40 dark:text-white/40 select-none text-sm whitespace-nowrap">
                /s/
              </span>
              <input
                type="text"
                required
                value={storeSlug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="emmas-boutique"
                className="input w-full pl-10"
              />
            </div>
            <p className="text-xs text-brand-400 mt-1.5 font-medium">
              🔗 {storeUrl}
            </p>
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2">
              Tagline{' '}
              <span className="text-dark-800/40 dark:text-white/30 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="e.g. Curated fashion for every occasion"
              className="input w-full"
              maxLength={100}
            />
          </div>

          {/* Business category */}
          <div>
            <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2">
              Business Category
            </label>
            <select
              title="Business Category"
              value={businessCategory}
              onChange={e => setBusinessCategory(e.target.value)}
              className="input w-full"
            >
              {BUSINESS_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2">
              Store Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell customers what you sell and why they'll love your shop!"
              className="input w-full resize-none"
            />
          </div>

          {/* Logo upload hint */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-cream-50 dark:bg-dark-700/50 border border-cream-200 dark:border-white/10">
            <Image size={18} className="text-dark-800/40 dark:text-white/30 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-dark-800/55 dark:text-white/45 leading-relaxed">
              You can upload a logo and hero banner image from your merchant dashboard after setup.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-cream-200 dark:border-white/10 text-dark-800/70 dark:text-white/60 text-sm font-medium hover:border-brand-400/40 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <button
            type="button"
            onClick={() => {
              if (!storeName || !storeSlug) {
                setError('Store name and URL are required.')
                return
              }
              setError('')
              setStep(3)
            }}
            className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
          >
            Continue <ArrowRight size={16} />
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-500 mt-3 bg-red-50 dark:bg-red-950/20 rounded-xl px-4 py-3 border border-red-100 dark:border-red-900/30">
            {error}
          </p>
        )}
      </main>
    )
  }

  // ── Step 3: Contact & Socials ─────────────────────────────────────────────
  return (
    <main className="flex-1 max-w-xl mx-auto px-4 py-16 w-full">
      <StepIndicator />
      <h2 className="text-2xl font-display font-bold text-dark-800 dark:text-white mb-2">
        Contact & Socials
      </h2>
      <p className="text-sm text-dark-800/55 dark:text-white/45 mb-8">
        How should customers reach you, and where can they follow you?
      </p>

      <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-6">
        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2 flex items-center gap-2">
            <WhatsappLogo size={16} className="text-green-500" /> WhatsApp Number{' '}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={whatsappNumber}
            onChange={e => setWhatsappNumber(e.target.value)}
            onBlur={() => setWhatsappNumber(formatPhoneNumber(whatsappNumber))}
            placeholder="+233 20 000 0000"
            autoComplete="tel"
            className="input w-full"
          />
          <p className="text-xs text-dark-800/40 dark:text-white/40 mt-1">
            Order notifications will be sent here via WhatsApp.
          </p>
        </div>

        {/* Instagram */}
        <div>
          <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2 flex items-center gap-2">
            <InstagramLogo size={16} className="text-pink-500" /> Instagram{' '}
            <span className="text-dark-800/40 dark:text-white/30 font-normal">(optional)</span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-dark-800/40 dark:text-white/40 text-sm">@</span>
            <input
              type="text"
              value={instagramHandle}
              onChange={e => setInstagramHandle(e.target.value.replace(/^@/, ''))}
              placeholder="yourshop"
              className="input w-full pl-8"
            />
          </div>
        </div>

        {/* TikTok */}
        <div>
          <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2 flex items-center gap-2">
            <TiktokLogo size={16} className="text-dark-800 dark:text-white" /> TikTok{' '}
            <span className="text-dark-800/40 dark:text-white/30 font-normal">(optional)</span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-dark-800/40 dark:text-white/40 text-sm">@</span>
            <input
              type="text"
              value={tiktokHandle}
              onChange={e => setTiktokHandle(e.target.value.replace(/^@/, ''))}
              placeholder="yourshop"
              className="input w-full pl-8"
            />
          </div>
        </div>

        {/* Facebook */}
        <div>
          <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2 flex items-center gap-2">
            <FacebookLogo size={16} className="text-blue-500" /> Facebook{' '}
            <span className="text-dark-800/40 dark:text-white/30 font-normal">(optional)</span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-dark-800/40 dark:text-white/40 text-sm">fb/</span>
            <input
              type="text"
              value={facebookHandle}
              onChange={e => setFacebookHandle(e.target.value)}
              placeholder="yourpagename"
              className="input w-full pl-10"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl px-4 py-3 border border-red-100 dark:border-red-900/30">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-cream-200 dark:border-white/10 text-dark-800/70 dark:text-white/60 text-sm font-medium hover:border-brand-400/40 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex-1 py-3 text-base flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              'Creating store...'
            ) : (
              <>
                <CheckCircle size={20} /> Create My Store
              </>
            )}
          </button>
        </div>
      </form>
    </main>
  )
}
