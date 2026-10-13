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
  ArrowUpRight,
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
      iconColor: '#25D366',
      bgHover: 'hover:bg-[#25D366]/[0.07] hover:border-[#25D366]/20',
    },
    {
      label: 'Email',
      value: 'cyrusadetu@gmail.com',
      href: 'mailto:cyrusadetu@gmail.com',
      Icon: EnvelopeSimple,
      iconColor: '#a0845c',
      bgHover: 'hover:bg-[#a0845c]/[0.07] hover:border-[#a0845c]/20',
    },
    {
      label: 'Call us',
      value: '0599399983',
      href: 'tel:0599399983',
      Icon: Phone,
      iconColor: '#5b82b0',
      bgHover: 'hover:bg-[#5b82b0]/[0.07] hover:border-[#5b82b0]/20',
    },
    settings.social_instagram && {
      label: 'Instagram',
      value: settings.social_instagram,
      href: socialUrl(settings.social_instagram, 'https://instagram.com/'),
      Icon: InstagramLogo,
      iconColor: '#C13584',
      bgHover: 'hover:bg-[#C13584]/[0.07] hover:border-[#C13584]/20',
    },
    settings.social_tiktok && {
      label: 'TikTok',
      value: settings.social_tiktok,
      href: socialUrl(settings.social_tiktok, 'https://tiktok.com/@'),
      Icon: TiktokLogo,
      iconColor: '#69C9D0',
      bgHover: 'hover:bg-[#69C9D0]/[0.07] hover:border-[#69C9D0]/20',
    },
    settings.social_facebook && {
      label: 'Facebook',
      value: settings.social_facebook,
      href: socialUrl(settings.social_facebook, 'https://facebook.com/'),
      Icon: FacebookLogo,
      iconColor: '#1877F2',
      bgHover: 'hover:bg-[#1877F2]/[0.07] hover:border-[#1877F2]/20',
    },
  ].filter(Boolean) as { label: string; value: string; href: string; Icon: React.ElementType; iconColor: string; bgHover: string }[]

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop' },
    { to: '/gallery', label: 'Gallery' },
    { to: '/blog', label: 'Blog' },
    { to: '/about', label: 'About' },
    { to: '/faq', label: 'FAQs' },
  ]

  const supportLinks = [
    { to: '/settings', label: 'Contact Us' },
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/terms', label: 'Terms of Service' },
    { to: '/feedback', label: 'Leave Feedback' },
  ]

  return (
    <footer className="mt-auto relative overflow-hidden border-t border-dark-800/[0.06] dark:border-white/[0.06]">

      {/* Subtle neutral warm ambient — not distracting */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#f6f3ef] dark:from-transparent dark:to-[#0c0a08] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 pt-14 pb-24 sm:pb-14">

        {/* Main Grid */}
        <div className="flex flex-col sm:flex-row gap-10 sm:gap-8 mb-10">

          {/* Brand Column */}
          <div className="flex flex-col items-center sm:items-start gap-4 sm:max-w-[240px] shrink-0">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-dark-800/[0.05] dark:bg-white/[0.05] border border-dark-800/[0.08] dark:border-white/[0.08] flex items-center justify-center text-dark-800/50 dark:text-white/50 group-hover:border-amber-500/30 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-all duration-300">
                <Storefront size={20} weight="duotone" />
              </div>
              <div>
                <p className="font-display font-bold text-base text-dark-800 dark:text-white leading-tight">
                  {settings.store_name}
                </p>
                <p className="text-[11px] text-dark-800/38 dark:text-white/32 font-medium mt-0.5">
                  Curated · Fast · Trusted
                </p>
              </div>
            </Link>

            <p className="text-[13px] text-dark-800/48 dark:text-white/38 leading-relaxed text-center sm:text-left">
              Handpicked products from verified local merchants. Fast delivery. Real support.
            </p>

            {/* Sell CTA */}
            <Link
              to="/sell"
              className="group inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-700/80 dark:text-amber-400/70 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            >
              <Storefront size={13} weight="fill" />
              Open your free store
              <ArrowUpRight size={12} weight="bold" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>

          {/* Nav Columns */}
          <div className="flex-1 flex flex-wrap justify-center sm:justify-end gap-8 sm:gap-14">

            <div className="flex flex-col gap-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-dark-800/30 dark:text-white/28 mb-0.5">
                Navigate
              </p>
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-[13px] font-medium text-dark-800/50 dark:text-white/42 hover:text-dark-800 dark:hover:text-white transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="flex flex-col gap-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-dark-800/30 dark:text-white/28 mb-0.5">
                Support
              </p>
              {supportLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-[13px] font-medium text-dark-800/50 dark:text-white/42 hover:text-dark-800 dark:hover:text-white transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-dark-800/[0.06] dark:bg-white/[0.06] mb-7" />

        {/* Bottom Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">

          {/* Social Icons */}
          <div className="flex items-center gap-2">
            {contactLinks.map(({ label, value, href, Icon, iconColor, bgHover }) => (
              <div key={label} className="relative group">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={`flex items-center justify-center w-9 h-9 rounded-xl bg-dark-800/[0.04] dark:bg-white/[0.04] border border-dark-800/[0.07] dark:border-white/[0.07] text-dark-800/38 dark:text-white/38 transition-all duration-200 hover:-translate-y-px ${bgHover}`}
                  style={{ '--hover-color': iconColor } as React.CSSProperties}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = iconColor}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = ''}
                >
                  <Icon size={17} weight="duotone" />
                </a>

                {/* Tooltip */}
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-dark-800 dark:bg-white text-white dark:text-dark-800 text-[10px] font-semibold rounded-lg opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 whitespace-nowrap z-10 shadow-lg">
                  {value}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-dark-800 dark:bg-white rotate-45" />
                </div>
              </div>
            ))}
          </div>

          {/* Copyright + Visitor */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            {settings.show_visitor_count && visitorCount !== null && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dark-800/[0.04] dark:bg-white/[0.04] border border-dark-800/[0.06] dark:border-white/[0.06] text-[10px] font-medium text-dark-800/38 dark:text-white/32 uppercase tracking-wider">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-55" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                {visitorCount.toLocaleString()} visits
              </div>
            )}
            <span className="text-[12px] text-dark-800/33 dark:text-white/28">
              &copy; {new Date().getFullYear()} {settings.store_name}. All rights reserved.
            </span>
          </div>
        </div>

      </div>
    </footer>
  )
}
