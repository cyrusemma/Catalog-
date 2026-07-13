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
  const [visitorCount, setVisitorCount] = useState<number | null>(null)

  useEffect(() => {
    if (!settings.show_visitor_count) return

    async function fetchVisitorCount() {
      try {
        const { data, error } = await supabase.rpc('get_visitor_count')
        if (!error && typeof data === 'number') {
          setVisitorCount(data)
        }
      } catch (err) {
        console.error('Error fetching visitor count:', err)
      }
    }

    fetchVisitorCount()
  }, [settings.show_visitor_count])

  const contactLinks = [
    settings.whatsapp_number && {
      label: 'WhatsApp',
      value: settings.whatsapp_number,
      href: `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`,
      Icon: WhatsappLogo,
      hoverClass: 'hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366]/30',
    },
    { 
      label: 'Email', 
      value: 'cyrusadetu@gmail.com', 
      href: 'mailto:cyrusadetu@gmail.com', 
      Icon: EnvelopeSimple,
      hoverClass: 'hover:bg-brand-400/10 hover:text-brand-400 hover:border-brand-400/30',
    },
    { 
      label: 'Call us', 
      value: '0599399983', 
      href: 'tel:0599399983', 
      Icon: Phone,
      hoverClass: 'hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30',
    },
    settings.social_instagram && {
      label: 'Instagram',
      value: settings.social_instagram,
      href: socialUrl(settings.social_instagram, 'https://instagram.com/'),
      Icon: InstagramLogo,
      hoverClass: 'hover:bg-[#E1306C]/10 hover:text-[#E1306C] hover:border-[#E1306C]/30',
    },
    settings.social_tiktok && {
      label: 'TikTok',
      value: settings.social_tiktok,
      href: socialUrl(settings.social_tiktok, 'https://tiktok.com/@'),
      Icon: TiktokLogo,
      hoverClass: 'hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30',
    },
    settings.social_facebook && {
      label: 'Facebook',
      value: settings.social_facebook,
      href: socialUrl(settings.social_facebook, 'https://facebook.com/'),
      Icon: FacebookLogo,
      hoverClass: 'hover:bg-[#1877F2]/10 hover:text-[#1877F2] hover:border-[#1877F2]/30',
    },
  ].filter(Boolean) as { label: string; value: string; href: string; Icon: React.ElementType; hoverClass: string }[]

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
          <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold text-dark-800/60 dark:text-white/50 mb-12">
            <Link to="/" className="hover:text-brand-400 transition-colors">Home</Link>
            <Link to="/shop" className="hover:text-brand-400 transition-colors">Shop</Link>
            <Link to="/cart" className="hover:text-brand-400 transition-colors">Cart</Link>
            <Link
              to="/sell"
              className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-400 text-white font-extrabold text-xs shadow-md shadow-brand-400/25 hover:bg-brand-500 transition-all hover:scale-105"
            >
              <Storefront size={12} weight="bold" />
              Sell with us
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
            </Link>
            <Link to="/settings" className="hover:text-brand-400 transition-colors">Contact & Settings</Link>
          </div>

        {/* Interaction Grid: Reviews & Contacts */}
        <div className="mb-10 w-full max-w-4xl flex justify-center">
          
          {/* Contact Links */}
          <div className="flex flex-col items-center">
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-dark-800/50 dark:text-white/40 mb-5">
              Connect with us
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {contactLinks.map(({ label, value, href, Icon, hoverClass }) => (
                <div key={label} className="relative group">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className={`flex items-center justify-center w-12 h-12 rounded-2xl bg-white/50 dark:bg-white/5 border border-brand-400/10 text-dark-800/60 dark:text-white/60 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 ${hoverClass}`}
                  >
                    <Icon size={22} weight="duotone" className="transition-transform group-hover:scale-110" />
                  </a>
                  
                  {/* Tooltip */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-dark-800 dark:bg-white text-white dark:text-dark-800 text-xs font-bold rounded-lg opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 whitespace-nowrap z-10 shadow-xl shadow-dark-900/10">
                    {value}
                    {/* Tooltip Arrow */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-dark-800 dark:bg-white rotate-45" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>

        {settings.show_visitor_count && visitorCount !== null && (
          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-400/10 border border-brand-400/25 text-[10px] font-extrabold uppercase tracking-wider text-brand-400 shadow-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-400"></span>
            </span>
            <span>{visitorCount.toLocaleString()} Site Visits</span>
          </div>
        )}

        {/* Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-md border-t border-brand-400/10 pt-6 text-xs text-dark-800/40 dark:text-white/30 gap-4">
          <span>&copy; {new Date().getFullYear()} {settings.store_name}. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-brand-400 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-brand-400 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
