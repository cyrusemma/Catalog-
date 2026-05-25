import { Link, useLocation } from 'react-router-dom'
import { ShoppingCart, Storefront, Moon, Sun } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '../../store/cartStore'
import { useTheme } from '../../hooks/useTheme'
import { useStoreSettings } from '../../hooks/useStoreSettings'

export default function Navbar() {
  const location = useLocation()
  const totalItems = useCartStore(s => s.totalItems())
  const { theme, toggle } = useTheme()
  const settings = useStoreSettings()

  const navLink = (to: string, label: string) => {
    const active = location.pathname === to
    return (
      <Link
        to={to}
        className={`text-sm font-medium transition-colors ${
          active
            ? 'text-brand-400'
            : 'text-dark-800/70 dark:text-white/70 hover:text-dark-800 dark:hover:text-white'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <nav className="sticky top-0 z-50 bg-cream-50/70 dark:bg-dark-900/70 backdrop-blur-xl border-b border-brand-400/10 safe-top">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group min-w-0 flex-1 sm:flex-none">
          <div className="w-9 h-9 flex-shrink-0 bg-gradient-to-br from-brand-400 to-brand-500 rounded-xl flex items-center justify-center shadow-amber-glow group-hover:shadow-amber-glow-lg transition-shadow">
            <Storefront size={18} weight="duotone" className="text-white" />
          </div>
          <span className="font-display font-bold text-lg text-dark-800 dark:text-white truncate">{settings.store_name}</span>
        </Link>

        <div className="hidden sm:flex items-center gap-7">
          {navLink('/', 'Home')}
          {navLink('/shop', 'Shop')}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-brand-400/10 transition-colors"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="inline-flex"
              >
                {theme === 'dark' ? (
                  <Sun size={18} weight="duotone" className="text-brand-400" />
                ) : (
                  <Moon size={18} weight="duotone" className="text-brand-500" />
                )}
              </motion.span>
            </AnimatePresence>
          </button>

          <Link to="/cart" className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-brand-400/10 transition-colors">
            <ShoppingCart size={20} weight="duotone" className="text-dark-800 dark:text-white" />
            <AnimatePresence>
              {totalItems > 0 && (
                <motion.span
                  key={totalItems}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-brand-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-amber-glow"
                >
                  {totalItems > 9 ? '9+' : totalItems}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </div>
    </nav>
  )
}
