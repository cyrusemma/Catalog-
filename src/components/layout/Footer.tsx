import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Storefront,
  InstagramLogo,
  FacebookLogo,
  TiktokLogo,
  WhatsappLogo,
  EnvelopeSimple,
  Phone,
  CaretRight,
  Heart,
  Star,
  PaperPlaneRight,
} from '@phosphor-icons/react'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { supabase } from '../../lib/supabase'

function socialUrl(value: string, base: string): string {
  const v = value.trim()
  if (/^https?:\/\//i.test(v)) return v
  return base + v.replace(/^@/, '')
}



export default function Footer() {
  const settings = useStoreSettings()
  const [hasReviewed, setHasReviewed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rating, setRating] = useState(5)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (localStorage.getItem('has_reviewed_site')) {
      setHasReviewed(true)
    }
  }, [])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (hasReviewed || isSubmitting || !message.trim()) return
    setIsSubmitting(true)
    
    try {
      await supabase.from('site_reviews').insert({
        rating,
        name: name.trim() || null,
        email: email.trim() || null,
        message: message.trim(),
        page_url: window.location.pathname
      })
      localStorage.setItem('has_reviewed_site', 'submitted')
      setHasReviewed(true)
    } catch (error) {
      console.error('Failed to submit review', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const contactLinks = [
    settings.whatsapp_number && {
      label: 'WhatsApp',
      value: settings.whatsapp_number,
      href: `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`,
      Icon: WhatsappLogo,
    },
    { label: 'Email', value: 'cyrusadetu@gmail.com', href: 'mailto:cyrusadetu@gmail.com', Icon: EnvelopeSimple },
    { label: 'Call us', value: '0599399983', href: 'tel:0599399983', Icon: Phone },
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
  ].filter(Boolean) as { label: string; value: string; href: string; Icon: React.ElementType }[]

  return (
    <footer className="mt-auto relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-400/10 via-brand-400/5 to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 pt-16 pb-24 sm:pb-16 flex flex-col items-center text-center">
        {/* Logo & Store Name */}
        <Link to="/" className="inline-flex flex-col items-center gap-3 group mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center text-brand-400 group-hover:bg-brand-400 group-hover:text-white group-hover:-rotate-6 group-hover:scale-110 transition-all duration-300 shadow-xl shadow-brand-400/5">
            <Storefront size={24} weight="duotone" />
          </div>
          <div>
            <p className="font-display font-bold text-xl text-dark-800 dark:text-white">{settings.store_name}</p>
            <p className="text-sm text-dark-800/50 dark:text-white/40 mt-1 font-medium">Curated products, fast support.</p>
          </div>
        </Link>

        {/* Quick Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-8 text-sm font-semibold text-dark-800/70 dark:text-white/70">
          <Link to="/" className="hover:text-brand-400 transition-colors">Home</Link>
          <Link to="/shop" className="hover:text-brand-400 transition-colors">Shop</Link>
          <Link to="/cart" className="hover:text-brand-400 transition-colors">Cart</Link>
          <Link to="/settings" className="hover:text-brand-400 transition-colors">Contact & Settings</Link>
        </div>

        {/* Interaction Grid: Reviews & Contacts */}
        <div className="mb-10 w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12">
          
          {/* Cute Review Section */}
          <div className="flex flex-col items-center sm:items-start text-left">
            <div className="flex items-center gap-2 mb-3 text-dark-800/80 dark:text-white/80">
              <Heart size={16} weight="duotone" className="text-brand-400" />
              <h3 className="text-sm font-bold uppercase tracking-[0.15em]">How are we doing?</h3>
            </div>
            <p className="text-xs text-dark-800/60 dark:text-white/50 mb-4 sm:max-w-xs text-center sm:text-left">
              Leave a quick rating to help us improve your experience.
            </p>

            {!hasReviewed ? (
              <form onSubmit={handleSubmitReview} className="w-full flex flex-col gap-3">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star size={24} weight={star <= rating ? 'fill' : 'regular'} className={star <= rating ? 'text-brand-400' : 'text-brand-400/30'} />
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Your Name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full sm:max-w-xs bg-white/50 dark:bg-dark-800/50 border border-brand-400/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400/50 focus:ring-2 focus:ring-brand-400/10 transition-all text-dark-800 dark:text-white placeholder-dark-800/40 dark:placeholder-white/30"
                />
                <input
                  type="email"
                  placeholder="Your Email (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full sm:max-w-xs bg-white/50 dark:bg-dark-800/50 border border-brand-400/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400/50 focus:ring-2 focus:ring-brand-400/10 transition-all text-dark-800 dark:text-white placeholder-dark-800/40 dark:placeholder-white/30"
                />
                <div className="relative w-full sm:max-w-xs">
                  <textarea
                    placeholder="Tell us what you think..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={3}
                    className="w-full bg-white/50 dark:bg-dark-800/50 border border-brand-400/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400/50 focus:ring-2 focus:ring-brand-400/10 transition-all text-dark-800 dark:text-white placeholder-dark-800/40 dark:placeholder-white/30 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="absolute bottom-2 right-2 p-2 bg-brand-400 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 disabled:hover:bg-brand-400 transition-colors shadow-sm"
                  >
                    <PaperPlaneRight size={16} weight="fill" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-2 text-brand-400 font-medium text-sm p-3 rounded-2xl bg-brand-400/10 border border-brand-400/20">
                <Heart size={16} weight="fill" className="animate-pulse" />
                Thanks for your feedback!
              </div>
            )}
          </div>

          {/* Contact Links */}
          <div className="flex flex-col items-center sm:items-start text-left">
            <div className="flex items-center gap-2 mb-4 text-dark-800/80 dark:text-white/80">
              <EnvelopeSimple size={16} weight="duotone" className="text-brand-400" />
              <h3 className="text-sm font-bold uppercase tracking-[0.15em]">Reach out</h3>
            </div>
            <div className="w-full flex flex-col gap-2">
              {contactLinks.map(({ label, value, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-2xl bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-brand-400/10 px-4 py-3 transition-all shadow-sm hover:shadow-md"
                >
                  <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center shadow-amber-glow group-hover:scale-110 transition-transform">
                    <Icon size={18} weight="fill" className="text-white" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-dark-800 dark:text-white group-hover:text-brand-400 transition-colors">{label}</span>
                    <span className="block text-[11px] font-medium text-dark-800/60 dark:text-white/50 truncate">{value}</span>
                  </span>
                  <CaretRight size={14} weight="bold" className="text-dark-800/20 dark:text-white/20 flex-shrink-0 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
                </a>
              ))}
            </div>
          </div>
          
        </div>

        {/* Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-md border-t border-brand-400/10 pt-6 text-xs text-dark-800/40 dark:text-white/30 gap-2">
          <span>© {new Date().getFullYear()} {settings.store_name}</span>
          <span className="flex items-center gap-1">
            Built with <span className="text-brand-400">♥</span> for smooth browsing
          </span>
        </div>
      </div>
    </footer>
  )
}
