/**
 * StoreNavbar — Merchant Storefront Top Bar
 *
 * Fully isolated from the platform Navbar. All links stay within the merchant's
 * /s/:storeSlug context. The store logo + name replace the platform brand mark.
 */
import { Link, useLocation } from 'react-router-dom'

import { ShoppingCart, Storefront, UserCircle } from '@phosphor-icons/react'
import { useCartStore } from '../../store/cartStore'
import { useCustomerSession } from '../../hooks/useCustomerSession'
import { useSignInStore } from '../../store/signInStore'
import { useStoreContext } from '../../contexts/StoreContext'
import ThemeToggle from '../ui/ThemeToggle'
import { motion } from 'framer-motion'

export default function StoreNavbar() {
  const { storeSlug, storeName, logoUrl } = useStoreContext()
  const location = useLocation()
  const totalItems = useCartStore(s => s.totalItems())
  const { isLoggedIn, profile } = useCustomerSession()
  const openSignIn = useSignInStore(s => s.openModal)

  const initials = profile
    ? (profile.display_name || profile.email || '?')
        .split(/\s+/)
        .map(part => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('') || '?'
    : ''

  const storeHome = `/s/${storeSlug}`
  const isAtHome = location.pathname === storeHome

  return (
    <div className="sticky top-0 z-50 pointer-events-none transition-all duration-300">
      <div className="max-w-5xl mx-auto pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))] pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pointer-events-auto">
        <nav
          className="
            flex items-center justify-between px-4 h-14 rounded-2xl
            bg-white/60 dark:bg-dark-900/60
            backdrop-blur-2xl backdrop-saturate-150
            border border-white/50 dark:border-white/10
            shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]
            dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.4)]
          "
        >
          {/* Store brand — links to THIS store's home, not the platform home */}
          <Link to={storeHome} className="flex items-center gap-2.5 group min-w-0 flex-1 sm:flex-none">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={storeName}
                className="w-8 h-8 flex-shrink-0 object-contain rounded-xl bg-white/5"
              />
            ) : (
              <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-brand-400 to-brand-500 rounded-xl flex items-center justify-center shadow-amber-glow group-hover:shadow-amber-glow-lg transition-shadow">
                <Storefront size={16} weight="duotone" className="text-white" />
              </div>
            )}
            <span className="font-display font-bold text-base text-dark-800 dark:text-white truncate">
              {storeName}
            </span>
          </Link>

          {/* Desktop nav — all within this store */}
          <div className="hidden sm:flex items-center gap-6">
            <Link
              to={storeHome}
              className={`text-sm font-medium transition-colors ${
                isAtHome
                  ? 'text-brand-400'
                  : 'text-dark-800/70 dark:text-white/70 hover:text-dark-800 dark:hover:text-white'
              }`}
            >
              Home
            </Link>
            {/* "Back to Marketplace" is deliberate and explicitly labelled — one way out */}
            <Link
              to="/"
              onClick={() => localStorage.removeItem('catalog_last_store')}
              className="text-sm font-medium text-dark-800/40 dark:text-white/40 hover:text-brand-400 transition-colors"
            >
              Marketplace ↗
            </Link>
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />

            {/* Cart — shared across all shops */}
            <Link to="/cart" className="relative w-8 h-8 rounded-xl flex items-center justify-center hover:bg-brand-400/10 transition-colors pointer-events-auto">
              <ShoppingCart size={18} weight="duotone" className="text-dark-800 dark:text-white" />
              {totalItems > 0 && (
                <motion.span 
                  key={totalItems}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: [1.3, 1] }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 bg-brand-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-amber-glow"
                >
                  {totalItems > 9 ? '9+' : totalItems}
                </motion.span>
              )}
            </Link>

            {isLoggedIn && profile ? (
              <Link
                to="/account"
                aria-label="Your account"
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-500 text-white text-[10px] font-bold ring-1 ring-brand-400/30 hover:ring-brand-400/60 transition-shadow"
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openSignIn()}
                aria-label="Sign in"
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-brand-400/10 transition-colors text-dark-800 dark:text-white"
              >
                <UserCircle size={18} weight="duotone" />
              </button>
            )}
          </div>
        </nav>
      </div>
    </div>
  )
}
