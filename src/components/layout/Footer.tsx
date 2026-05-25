import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Store,
  Mail,
  MessageCircleMore,
  PhoneCall,
  Siren,
  Instagram,
  ArrowUpRight,
  Sparkles,
  MessageSquareQuote,
} from 'lucide-react'
import { useStoreSettings } from '../../hooks/useStoreSettings'

export default function Footer() {
  const settings = useStoreSettings()

  const contactItems = [
    { label: 'Email', value: 'cyrusadetu@gmail.com', href: 'mailto:cyrusadetu@gmail.com', Icon: Mail },
    { label: 'WhatsApp', value: '0574090147', href: 'https://wa.me/233574090147', Icon: MessageCircleMore },
    { label: 'Call us', value: '0599399983', href: 'tel:0599399983', Icon: PhoneCall },
    { label: 'Complaints', value: 'Hot line for complaints', href: 'tel:0599399983', Icon: Siren },
    { label: 'Instagram', value: '@cyrus._.emma', href: 'https://instagram.com/cyrus._.emma', Icon: Instagram },
  ]

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
              <motion.div
                whileHover={{ scale: 1.08, rotate: -4 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                className="w-11 h-11 rounded-2xl bg-brand-400/15 border border-brand-400/20 flex items-center justify-center text-brand-400 group-hover:bg-brand-400 group-hover:text-white transition-colors"
              >
                <Store size={20} />
              </motion.div>
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
              <Sparkles size={16} className="text-brand-400" />
              <h3 className="font-semibold text-base">Contact</h3>
            </div>
            <div className="space-y-2">
              {contactItems.map(({ label, value, href, Icon }) => (
                <motion.a
                  key={label}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noreferrer' : undefined}
                  whileHover={{ scale: 1.03, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                  className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm text-dark-800/60 dark:text-white/55 hover:border-brand-400/20 hover:bg-brand-400/8 hover:text-brand-400 transition-colors"
                >
                  <Icon size={16} className="text-gray-400 group-hover:text-brand-400 transition-colors" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[10px] uppercase tracking-[0.22em] text-gray-500 group-hover:text-brand-400">{label}</span>
                    <span className="block truncate font-medium text-dark-800 dark:text-white group-hover:text-brand-400">{value}</span>
                  </span>
                  <ArrowUpRight size={14} className="text-gray-400 group-hover:text-brand-400 transition-colors" />
                </motion.a>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-5 text-dark-800 dark:text-white">
              <MessageSquareQuote size={16} className="text-brand-400" />
              <h3 className="font-semibold text-base">Quick Links</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {quickLinks.map((link) => (
                <motion.div
                  key={link.label}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                >
                  <Link
                    to={link.href}
                    className="group flex items-center justify-between rounded-2xl border border-white/0 bg-white/40 dark:bg-white/5 px-4 py-3 text-dark-800/60 dark:text-white/55 hover:bg-brand-400 hover:text-white hover:shadow-amber-glow transition-all"
                  >
                    <span>{link.label}</span>
                    <ArrowUpRight size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </motion.div>
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
