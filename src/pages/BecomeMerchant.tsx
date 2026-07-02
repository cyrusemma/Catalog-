import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Storefront, WhatsappLogo, Link as LinkIcon, CheckCircle } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import { useSignInStore } from '../store/signInStore'

export default function BecomeMerchant() {
  const navigate = useNavigate()
  const openSignIn = useSignInStore(s => s.openModal)
  const [user, setUser] = useState<any>(null)
  const [storeName, setStoreName] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [businessCategory, setBusinessCategory] = useState('Fashion')
  const [description, setDescription] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setError("Please sign in first to create a store.")
      return
    }

    if (!storeName || !storeSlug || !whatsappNumber) {
      setError("Please fill in all required fields.")
      return
    }

    // Basic slug validation
    if (!/^[a-z0-9-]+$/.test(storeSlug)) {
      setError("Slug can only contain lowercase letters, numbers, and hyphens.")
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { error: insertError } = await supabase.from('stores').insert({
        name: storeName,
        slug: storeSlug,
        whatsapp_number: whatsappNumber,
        business_category: businessCategory,
        description: description,
        instagram_handle: instagramHandle,
        owner_id: user.id
      })

      if (insertError) {
        if (insertError.code === '23505') {
          setError("That store URL slug is already taken. Please choose another one.")
        } else {
          setError(insertError.message)
        }
        return
      }

      // Success! Redirect to admin dashboard
      navigate('/admin')
      
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-4 py-20 text-center">
        <Storefront size={64} className="text-brand-400 mb-6" />
        <h1 className="text-3xl font-display font-bold text-dark-800 dark:text-white mb-4">
          Become a Seller
        </h1>
        <p className="text-dark-800/60 dark:text-white/60 mb-8 max-w-md">
          Join our marketplace and start selling your products today. Please sign in or create an account first.
        </p>
        <button onClick={() => openSignIn()} className="btn-primary">
          Sign In to Continue
        </button>
      </main>
    )
  }

  return (
    <main className="flex-1 max-w-xl mx-auto px-4 py-20 w-full">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-brand-100 dark:bg-brand-500/20 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Storefront size={40} weight="duotone" />
        </div>
        <h1 className="text-3xl font-display font-bold text-dark-800 dark:text-white mb-2">
          Setup Your Store
        </h1>
        <p className="text-dark-800/60 dark:text-white/60">
          Fill in your details below to create your seller dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2">
            Store Name
          </label>
          <input
            type="text"
            required
            value={storeName}
            onChange={(e) => {
              setStoreName(e.target.value)
              if (!storeSlug) {
                setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'))
              }
            }}
            placeholder="e.g. My Awesome Shop"
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2 flex items-center gap-2">
            <LinkIcon size={16} className="text-brand-400" /> Store URL Slug
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-dark-800/40 dark:text-white/40 select-none text-sm">
              catalog.com/s/
            </span>
            <input
              type="text"
              required
              value={storeSlug}
              onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="my-shop"
              className="input w-full pl-28"
            />
          </div>
          <p className="text-xs text-dark-800/40 dark:text-white/40 mt-1">This will be your unique shop link.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2 flex items-center gap-2">
            <WhatsappLogo size={16} className="text-green-500" /> WhatsApp Number
          </label>
          <input
            type="tel"
            required
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+233 20 000 0000"
            className="input w-full"
          />
          <p className="text-xs text-dark-800/40 dark:text-white/40 mt-1">Orders for your products will be sent here.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2">
            Business Category
          </label>
          <select
            title="Business Category"
            aria-label="Business Category"
            value={businessCategory}
            onChange={(e) => setBusinessCategory(e.target.value)}
            className="input w-full"
          >
            <option value="Fashion">Fashion & Apparel</option>
            <option value="Electronics">Electronics & Tech</option>
            <option value="Beauty">Beauty & Cosmetics</option>
            <option value="Home">Home & Decor</option>
            <option value="Food">Food & Groceries</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2">
            Store Description
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us what you sell and why customers will love it!"
            className="input w-full resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-dark-800 dark:text-white mb-2">
            Instagram Handle (Optional)
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-dark-800/40 dark:text-white/40 select-none text-sm">
              @
            </span>
            <input
              type="text"
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value)}
              placeholder="yourshop"
              className="input w-full pl-8"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-4 text-base mt-4 flex items-center justify-center gap-2">
          {isSubmitting ? 'Creating...' : <><CheckCircle size={20} /> Create Store</>}
        </button>
      </form>
    </main>
  )
}
