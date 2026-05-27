import { Link } from 'react-router-dom'
import {
  Storefront,
  Envelope,
  WhatsappLogo,
  Phone,
  WarningOctagon,
  InstagramLogo,
  FacebookLogo,
  ArrowUpRight,
  Sparkle,
  ChatCircleText,
  TiktokLogo,
} from '@phosphor-icons/react'
import { useStoreSettings } from '../../hooks/useStoreSettings'

type ContactItem = {
  label: string
  value: string
  href: string
  // Icons come from different libraries (lucide + phosphor) with different prop types;
  // a permissive type avoids fighting both signatures.
  Icon: React.ComponentType<Record<string, unknown>>
}

const stripProtocol = (url: string) => url.replace(/^https?:\/\//i, '').replace(/\/$/, '')

export default function Footer() {
  const settings = useStoreSettings()

  const baseContacts: ContactItem[] = [
    { label: 'Email', value: 'cyrusadetu@gmail.com', href: 'mailto:cyrusadetu@gmail.com', Icon: Envelope as unknown as React.ComponentType<Record<string, unknown>> },
    settings.whatsapp_number
      ? { label: 'WhatsApp', value: settings.whatsapp_number, href: `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`, Icon: WhatsappLogo as unknown as React.ComponentType<Record<string, unknown>> }
      : { label: 'WhatsApp', value: '0574090147', href: 'https://wa.me/233574090147', Icon: WhatsappLogo as unknown as React.ComponentType<Record<string, unknown>> },
    { label: 'Call us', value: '0599399983', href: 'tel:0599399983', Icon: Phone as unknown as React.ComponentType<Record<string, unknown>> },
    { label: 'Complaints', value: 'Hot line for complaints', href: 'tel:0599399983', Icon: WarningOctagon as unknown as React.ComponentType<Record<string, unknown>> },
  ]

  const socialContacts: ContactItem[] = [
    settings.social_instagram
      ? { label: 'Instagram', value: stripProtocol(settings.social_instagram), href: settings.social_instagram, Icon: InstagramLogo as unknown as React.ComponentType<Record<string, unknown>> }
      : null,
    settings.social_tiktok
      ? { label: 'TikTok', value: stripProtocol(settings.social_tiktok), href: settings.social_tiktok, Icon: TiktokLogo as unknown as React.ComponentType<Record<string, unknown>> }
      // ^ TikTok was already phosphor pre-swap
      : null,
    settings.social_facebook
      ? { label: 'Facebook', value: stripProtocol(settings.social_facebook), href: settings.social_facebook, Icon: FacebookLogo as unknown as React.ComponentType<Record<string, unknown>> }
      : null,
  ].filter((x): x is ContactItem => x !== null)

  const contactItems = [...baseContacts, ...socialContacts]

  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    { label: 'Cart', href: '/cart' },
    { label: 'Wishlist', href: '/wishlist' },
  ]

  return (
    <footer className="mt-auto hidden lg:block border-t border-brand-400/10 bg-gradient-to-b from-transparent via-brand-400/5 to-dark-900/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-brand-400/15 border border-brand-400/20 flex items-center justify-center text-brand-400 group-hover:bg-brand-400 group-hover:text-white group-hover:-rotate-3 group-hover:scale-105 transition-all">
                <Storefront size={20} weight="duotone" />
              </div>
              <div>
                <p className="font-display font-bold text-lg text-dark-800 dark:text-white">{settings.store_name}</p>
                <p className="text-xs text-dark-800/50 dark:text-white/45">Curated products, fast support, real contact.</p>
              </div>
            </Link>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-dark-800/60 dark:text-white/50">
              Reach us directly for orders, support, custom requests, complaints, and social updates.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-5 text-dark-800 dark:text-white">
              <Sparkle size={16} weight="fill" className="text-brand-400" />
              <h3 className="font-semibold text-base">Contact</h3>
            </div>
            <div className="space-y-2">
              {contactItems.map(({ label, value, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noreferrer' : undefined}
                  className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm text-dark-800/60 dark:text-white/55 hover:border-brand-400/20 hover:bg-brand-400/8 hover:text-brand-400 hover:translate-x-1 transition-all"
                >
                  <Icon size={16} className="text-gray-400 group-hover:text-brand-400 transition-colors" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[10px] uppercase tracking-[0.22em] text-gray-500 group-hover:text-brand-400">{label}</span>
                    <span className="block truncate font-medium text-dark-800 dark:text-white group-hover:text-brand-400">{value}</span>
                  </span>
                  <ArrowUpRight size={14} className="text-gray-400 group-hover:text-brand-400 transition-colors" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-5 text-dark-800 dark:text-white">
              <ChatCircleText size={16} weight="duotone" className="text-brand-400" />
              <h3 className="font-semibold text-base">Quick Links</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {quickLinks.map((link) => (
                <div
                  key={link.label}
                  className="transition-transform hover:-translate-y-0.5 hover:scale-[1.02]"
                >
                  <Link
                    to={link.href}
                    className="group flex items-center justify-between rounded-2xl border border-white/0 bg-white/40 dark:bg-white/5 px-4 py-3 text-dark-800/60 dark:text-white/55 hover:bg-brand-400 hover:text-white hover:shadow-amber-glow transition-all"
                  >
                    <span>{link.label}</span>
                    <ArrowUpRight size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-brand-400/10 bg-dark-800/40 px-4 py-3 text-xs text-white/55">
              <span>© {new Date().getFullYear()} {settings.store_name}</span>
              <span className="text-brand-400">Built for smooth browsing</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
