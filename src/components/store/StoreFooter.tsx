/**
 * StoreFooter — Merchant Storefront Footer
 *
 * Self-contained merchant footer. Shows:
 * - Store name + tagline
 * - Merchant's social links (Instagram, TikTok, Facebook)
 * - WhatsApp contact button
 * - ONE deliberate "Browse Marketplace" link back to platform (/)
 *   — the only escape hatch, always visible and explicitly labelled.
 * - NO platform site-review form (that lives on the platform layer only)
 */
import { Link } from 'react-router-dom'
import {
  Storefront,
  InstagramLogo,
  FacebookLogo,
  TiktokLogo,
  WhatsappLogo,
  ArrowSquareOut,
} from '@phosphor-icons/react'
import { useStoreContext } from '../../contexts/StoreContext'

function socialUrl(value: string, base: string): string {
  const v = value.trim()
  if (/^https?:\/\//i.test(v)) return v
  return base + v.replace(/^@/, '')
}

export default function StoreFooter() {
  const { storeName, tagline, socialInstagram, socialTiktok, socialFacebook, whatsappNumber } =
    useStoreContext()

  const socials = [
    whatsappNumber && {
      label: 'WhatsApp',
      value: whatsappNumber,
      href: `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`,
      Icon: WhatsappLogo,
      hoverClass: 'hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366]/30',
    },
    socialInstagram && {
      label: 'Instagram',
      value: '@' + socialInstagram.replace(/^@/, ''),
      href: socialUrl(socialInstagram, 'https://instagram.com/'),
      Icon: InstagramLogo,
      hoverClass: 'hover:bg-[#E1306C]/10 hover:text-[#E1306C] hover:border-[#E1306C]/30',
    },
    socialTiktok && {
      label: 'TikTok',
      value: '@' + socialTiktok.replace(/^@/, ''),
      href: socialUrl(socialTiktok, 'https://tiktok.com/@'),
      Icon: TiktokLogo,
      hoverClass: 'hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30',
    },
    socialFacebook && {
      label: 'Facebook',
      value: socialFacebook,
      href: socialUrl(socialFacebook, 'https://facebook.com/'),
      Icon: FacebookLogo,
      hoverClass: 'hover:bg-[#1877F2]/10 hover:text-[#1877F2] hover:border-[#1877F2]/30',
    },
  ].filter(Boolean) as { label: string; value: string; href: string; Icon: React.ElementType; hoverClass: string }[]

  return (
    <footer className="mt-auto relative overflow-hidden">
      {/* Subtle brand tint */}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-400/8 via-brand-400/4 to-transparent pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 pt-12 pb-24 sm:pb-14 flex flex-col items-center text-center gap-8">
        {/* Store identity */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center text-brand-400">
            <Storefront size={24} weight="duotone" />
          </div>
          <div>
            <p className="font-display font-bold text-xl text-dark-800 dark:text-white">
              {storeName}
            </p>
            {tagline && (
              <p className="text-sm text-dark-800/50 dark:text-white/40 mt-1">{tagline}</p>
            )}
          </div>
        </div>

        {/* Social & Contact Links */}
        {socials.length > 0 && (
          <div className="flex flex-col items-center">
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-dark-800/50 dark:text-white/40 mb-5">
              Connect with us
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {socials.map(({ label, value, href, Icon, hoverClass }) => (
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
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-dark-800 dark:bg-white rotate-45" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deliberate platform escape hatch — always visible, explicitly labelled */}
        <div className="border-t border-brand-400/10 pt-6 w-full max-w-xs">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-dark-800/40 dark:text-white/30 hover:text-brand-400 transition-colors group"
          >
            <ArrowSquareOut
              size={14}
              weight="bold"
              className="group-hover:text-brand-400 transition-colors"
            />
            Browse the full marketplace
          </Link>
          <p className="text-[11px] text-dark-800/25 dark:text-white/20 mt-3">
            &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
