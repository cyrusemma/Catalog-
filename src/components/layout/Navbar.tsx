import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShoppingCart, Storefront, UserCircle, Gear, SquaresFour } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useCartStore } from '../../store/cartStore'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { useCustomerSession } from '../../hooks/useCustomerSession'
import { useSignInStore } from '../../store/signInStore'
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter'
import ThemeToggle from '../ui/ThemeToggle'
import NotificationButton from '../ui/NotificationButton'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { effectivePrice } from '../../lib/utils'

export default function Navbar() {
  const location = useLocation()
  const totalItems = useCartStore(s => s.totalItems())
  const cartItems = useCartStore(s => s.items)
  const subtotal = useCartStore(s => s.totalPrice())
  const settings = useStoreSettings()
  const { isLoggedIn, profile, user } = useCustomerSession()
  const openSignIn = useSignInStore(s => s.openModal)
  const formatPrice = useCurrencyFormatter()

  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showMiniCart, setShowMiniCart] = useState(false)
  const lastY = useRef(0)
  const miniCartTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openMiniCart = () => {
    if (miniCartTimeout.current) clearTimeout(miniCartTimeout.current)
    setShowMiniCart(true)
  }

  const closeMiniCart = () => {
    miniCartTimeout.current = setTimeout(() => setShowMiniCart(false), 180)
  }

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY
      
      // Calculate scroll transparency threshold
      setScrolled(currentY > 20)

      if (currentY < 60) {
        setHidden(false)                          // Always show near top
      } else if (currentY > lastY.current + 4) {
        setHidden(true)                           // Scrolling DOWN → hide (UX correction)
      } else if (currentY < lastY.current - 4) {
        setHidden(false)                          // Scrolling UP → show (UX correction)
      }
      lastY.current = currentY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Two-letter initials for the avatar fallback when there's no avatar_url.
  const initials = profile
    ? (profile.display_name || profile.email || '?')
      .split(/\s+/)
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('') || '?'
    : ''

  // Look up store association if user is logged in (for quick dashboard routing)
  const isPlatformAdmin = user?.app_metadata?.role === 'admin'

  const { data: merchantStore } = useQuery({
    queryKey: ['navbar-merchant-store', user?.id],
    queryFn: async () => {
      if (!user?.id || isPlatformAdmin) return null
      const { data } = await supabase
        .from('stores')
        .select('id, slug')
        .eq('owner_id', user.id)
        .maybeSingle()
      return data || null
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 15,
  })

  const showDashboardLink = isPlatformAdmin || !!merchantStore

  const navLink = (to: string, label: string) => {
    const active = location.pathname === to
    return (
      <Link
        to={to}
        className={`relative px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 z-10 flex items-center justify-center ${active
          ? 'text-brand-500 dark:text-brand-400 font-semibold'
          : 'text-dark-800/75 dark:text-white/75 hover:text-dark-800 dark:hover:text-white'
          }`}
      >
        {active && (
          <motion.div
            layoutId="navbar-active-pill"
            className="absolute inset-0 bg-brand-400/10 dark:bg-brand-400/20 rounded-xl -z-10"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        {label}
      </Link>
    )
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 pointer-events-none transition-transform duration-300 ease-in-out ${hidden ? '-translate-y-full' : 'translate-y-0'}`}>
      <div className="max-w-5xl mx-auto pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))] pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pointer-events-auto">
        <nav className={`
          flex items-center justify-between px-4 h-14 rounded-2xl
          border transition-all duration-300
          ${scrolled 
            ? 'bg-white/60 dark:bg-dark-900/60 backdrop-blur-2xl backdrop-saturate-150 border-white/50 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.4)]'
            : 'bg-white/10 dark:bg-dark-900/25 backdrop-blur-sm border-cream-200/10 dark:border-white/5 shadow-sm dark:shadow-none'
          }
        `}>
          <Link to="/" className="flex items-center gap-2.5 group min-w-0 flex-1 sm:flex-none">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.store_name}
                className="w-8 h-8 flex-shrink-0 object-contain rounded-xl bg-white/5"
              />
            ) : (
              <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-brand-400 to-brand-500 rounded-xl flex items-center justify-center shadow-amber-glow group-hover:shadow-amber-glow-lg transition-shadow">
                <Storefront size={16} weight="duotone" className="text-white" />
              </div>
            )}
            <span className="font-display font-bold text-base text-dark-800 dark:text-white truncate">{settings.store_name}</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2">
            {navLink('/', 'Home')}
            {navLink('/shop', 'Shop')}
            {navLink('/gallery', 'Gallery')}
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationButton />

            {showDashboardLink && (
              <Link
                to="/admin"
                aria-label="Merchant Dashboard"
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-brand-400/10 transition-colors text-brand-500 dark:text-brand-400"
                title="Go to Admin Panel"
              >
                <SquaresFour size={18} weight="duotone" />
              </Link>
            )}

            <Link
              to="/settings"
              aria-label="Settings"
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-brand-400/10 transition-colors text-dark-800 dark:text-white"
            >
              <Gear size={17} weight="duotone" />
            </Link>

            {/* Cart Preview Hover Wrapper */}
            <div
              className="relative"
              onMouseEnter={openMiniCart}
              onMouseLeave={closeMiniCart}
            >
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

              {/* Hover Mini-Cart Dropdown */}
              <AnimatePresence>
                {showMiniCart && totalItems > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    onMouseEnter={openMiniCart}
                    onMouseLeave={closeMiniCart}
                    className="absolute right-0 top-full pt-2 w-72 z-50"
                  >
                    <div className="rounded-2xl bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border border-cream-200 dark:border-white/10 shadow-2xl p-4 text-left pointer-events-auto flex flex-col gap-3">
                      <p className="text-[10px] font-bold text-dark-800/40 dark:text-white/40 uppercase tracking-wider">Cart Summary ({totalItems})</p>
                      <div className="max-h-48 overflow-y-auto divide-y divide-gray-150/40 dark:divide-white/5 pr-1 scrollbar-thin">
                        {cartItems.slice(0, 3).map((item) => {
                          const priceVal = effectivePrice(item.product)
                          return (
                            <div key={item.product.id} className="py-2.5 flex gap-2.5 items-center">
                              <img
                                src={item.product.images?.[0] || 'https://placehold.co/40x40/f3f4f6/9ca3af?text=?'}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0 border border-gray-100 dark:border-white/5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-dark-800 dark:text-white truncate">{item.product.title}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{item.quantity} × {formatPrice(priceVal)}</p>
                              </div>
                            </div>
                          )
                        })}
                        {cartItems.length > 3 && (
                          <p className="text-[10px] text-center text-brand-500 py-1.5 font-semibold">And {cartItems.length - 3} more items...</p>
                        )}
                      </div>
                      <div className="border-t border-gray-150/40 dark:border-white/5 pt-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-dark-800/60 dark:text-white/60">Subtotal:</span>
                        <span className="text-sm font-bold text-dark-800 dark:text-white">{formatPrice(subtotal)}</span>
                      </div>
                      <Link
                        to="/cart"
                        className="w-full bg-brand-400 hover:bg-brand-500 text-white text-xs font-bold py-2 rounded-xl text-center shadow-md shadow-brand-400/10 block transition-all"
                      >
                        Go to Checkout
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isLoggedIn && profile ? (
              <Link
                to="/account"
                aria-label="Your account"
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-500 text-white text-[10px] font-bold ring-1 ring-brand-400/30 hover:ring-brand-400/60 transition-shadow ml-1"
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
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-brand-400/10 transition-colors text-dark-800 dark:text-white ml-1"
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
