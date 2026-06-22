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
} from '@phosphor-icons/react'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { supabase } from '../../lib/supabase'

function socialUrl(value: string, base: string): string {
  const v = value.trim()
  if (/^https?:\/\//i.test(v)) return v
  return base + v.replace(/^@/, '')
}

const RATINGS = [
  { value: 'poor', emoji: '😔' },
  { value: 'okay', emoji: '😐' },
  { value: 'good', emoji: '🙂' },
  { value: 'amazing', emoji: '😍' },
]

export default function Footer() {
  const settings = useStoreSettings()
  const [hasReviewed, setHasReviewed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('has_reviewed_site')) {
      setHasReviewed(true)
    }
  }, [])

  const handleRate = async (rating: string) => {
    if (hasReviewed || isSubmitting) return
    setIsSubmitting(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.from('site_reviews').insert({
        rating,
        user_id: session?.user?.id || null,
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

      <div className="relative max-w-5xl mx-auto px-4 pt-16 pb-28 lg:pb-16 flex flex-col items-center text-center">
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
              <div className="flex justify-center sm:justify-start gap-3 w-full">
                {RATINGS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => handleRate(r.value)}
                    disabled={isSubmitting}
                    className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl bg-white/50 dark:bg-dark-800/50 border border-brand-400/20 text-2xl hover:scale-110 hover:border-brand-400 hover:bg-brand-400/10 transition-all disabled:opacity-50 shadow-sm"
                    aria-label={`Rate ${r.value}`}
                  >
                    <span className="filter drop-shadow-sm">{r.emoji}</span>
                  </button>
                ))}
              </div>
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
