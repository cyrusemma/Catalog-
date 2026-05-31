import { Link, useLocation } from 'react-router-dom'
import { ShoppingCart, Storefront, SignIn } from '@phosphor-icons/react'
import { useCartStore } from '../../store/cartStore'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { useCustomerSession } from '../../hooks/useCustomerSession'
import { useSignInStore } from '../../store/signInStore'
import ThemePicker from '../ui/ThemePicker'
import NotificationButton from '../ui/NotificationButton'

export default function Navbar() {
  const location = useLocation()
  const totalItems = useCartStore(s => s.totalItems())
  const settings = useStoreSettings()
  const { isLoggedIn, profile } = useCustomerSession()
  const openSignIn = useSignInStore(s => s.openModal)

  // Two-letter initials for the avatar fallback when there's no avatar_url.
  const initials = profile
    ? (profile.display_name || profile.email || '?')
        .split(/\s+/)
        .map(part => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('') || '?'
    : ''

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
    <nav className="sticky top-0 z-50 bg-cream-50/75 dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 border-b border-cream-200/50 dark:border-white/[0.08] safe-top shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_30px_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group min-w-0 flex-1 sm:flex-none">
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.store_name}
              className="w-9 h-9 flex-shrink-0 object-contain rounded-xl bg-white/5"
            />
          ) : (
            <div className="w-9 h-9 flex-shrink-0 bg-gradient-to-br from-brand-400 to-brand-500 rounded-xl flex items-center justify-center shadow-amber-glow group-hover:shadow-amber-glow-lg transition-shadow">
              <Storefront size={18} weight="duotone" className="text-white" />
            </div>
          )}
          <span className="font-display font-bold text-lg text-dark-800 dark:text-white truncate">{settings.store_name}</span>
        </Link>

        <div className="hidden sm:flex items-center gap-7">
          {navLink('/', 'Home')}
          {navLink('/shop', 'Shop')}
        </div>

        <div className="flex items-center gap-1.5">
          <ThemePicker />
          <NotificationButton />

          <Link to="/cart" className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-brand-400/10 transition-colors">
            <ShoppingCart size={20} weight="duotone" className="text-dark-800 dark:text-white" />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-brand-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-amber-glow animate-scale-in">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </Link>

          {isLoggedIn && profile ? (
            <Link
              to="/account"
              aria-label="Your account"
              className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-500 text-white text-[11px] font-bold ring-1 ring-brand-400/30 hover:ring-brand-400/60 transition-shadow"
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
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-brand-400/10 transition-colors text-dark-800 dark:text-white"
            >
              <SignIn size={18} weight="duotone" />
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
