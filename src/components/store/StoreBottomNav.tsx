/**
 * StoreBottomNav — Merchant Storefront Bottom Navigation
 *
 * Replaces the global BottomNav when inside /s/:storeSlug. All primary nav links
 * stay scoped to this merchant's store. The cart (shared session) still works
 * globally. There is no "Shop" link that could accidentally go to the platform shop.
 */
import { Link, useLocation } from 'react-router-dom'
import { House, ShoppingCart, Heart, Storefront } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useCartStore } from '../../store/cartStore'
import { useWishlistStore } from '../../store/wishlistStore'
import { useStoreContext } from '../../contexts/StoreContext'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'

type NavItem = {
  getTo: (slug: string) => string
  label: string
  Icon: PhosphorIcon
  badgeKind?: 'cart' | 'wishlist'
  exact?: boolean
}

const items: NavItem[] = [
  { getTo: (slug) => `/s/${slug}`, label: 'Home', Icon: House, exact: true },
  { getTo: (slug) => `/s/${slug}#products`, label: 'Products', Icon: Storefront },
  { getTo: () => '/wishlist', label: 'Saved', Icon: Heart, badgeKind: 'wishlist' },
  { getTo: () => '/cart', label: 'Cart', Icon: ShoppingCart, badgeKind: 'cart' },
]

export default function StoreBottomNav() {
  const { storeSlug } = useStoreContext()
  const location = useLocation()
  const totalItems = useCartStore(s => s.totalItems())
  const wishlistCount = useWishlistStore(s => s.count())

  return (
    <nav className="sm:hidden fixed bottom-2 pb-[max(0px,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] z-50 pointer-events-none">
      <div className="max-w-[400px] mx-auto pointer-events-auto flex items-center justify-between bg-white/85 dark:bg-dark-900/85 backdrop-blur-2xl backdrop-saturate-150 border border-cream-200 dark:border-white/10 rounded-full p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {items.map(({ getTo, label, Icon, badgeKind, exact }) => {
          const to = getTo(storeSlug)
          // Strip hash for active detection
          const toPath = to.split('#')[0]
          const active = exact
            ? location.pathname === toPath
            : location.pathname === toPath || location.pathname.startsWith(toPath + '/')
          const badgeValue =
            badgeKind === 'cart' ? totalItems : badgeKind === 'wishlist' ? wishlistCount : 0

          return (
            <Link
              key={label}
              to={to}
              className={`relative flex items-center justify-center transition-all duration-300 ${
                active ? 'px-4 py-2.5' : 'w-10 h-10'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="store-bottom-nav-indicator"
                  className="absolute inset-0 glass-pill"
                  transition={{ type: 'spring', stiffness: 180, damping: 15, mass: 1.5 }}
                />
              )}

              <div className="relative z-10 flex items-center gap-1.5">
                <Icon
                  size={20}
                  weight={active ? 'fill' : 'duotone'}
                  className={
                    active
                      ? 'text-brand-500 dark:text-brand-400'
                      : 'text-dark-800/40 dark:text-white/40 hover:text-dark-800 dark:hover:text-white transition-colors'
                  }
                />

                {badgeValue > 0 && !active && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-[3px] bg-brand-400 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {badgeValue > 9 ? '9+' : badgeValue}
                  </span>
                )}

                {active && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    className="text-[11px] font-bold text-brand-500 dark:text-brand-400 overflow-hidden whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
