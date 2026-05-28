import { Link, useLocation } from 'react-router-dom'
import { House, Storefront, ShoppingCart, Heart } from '@phosphor-icons/react'
import { useCartStore } from '../../store/cartStore'
import { useWishlistStore } from '../../store/wishlistStore'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'

type NavItem = { to: string; label: string; Icon: PhosphorIcon; badgeKind?: 'cart' | 'wishlist' }

const items: NavItem[] = [
  { to: '/', label: 'Home', Icon: House },
  { to: '/shop', label: 'Shop', Icon: Storefront },
  { to: '/wishlist', label: 'Wishlist', Icon: Heart, badgeKind: 'wishlist' },
  { to: '/cart', label: 'Cart', Icon: ShoppingCart, badgeKind: 'cart' },
]

export default function BottomNav() {
  const location = useLocation()
  const totalItems = useCartStore(s => s.totalItems())
  const wishlistCount = useWishlistStore(s => s.count())

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-cream-50/90 dark:bg-dark-900/90 backdrop-blur-xl border-t border-brand-400/15 pb-safe">
      <div className="grid grid-cols-4 max-w-md mx-auto px-2">
        {items.map(({ to, label, Icon, badgeKind }) => {
          const active = location.pathname === to
          const badgeValue = badgeKind === 'cart' ? totalItems : badgeKind === 'wishlist' ? wishlistCount : 0
          return (
            <Link
              key={label}
              to={to}
              className="flex flex-col items-center justify-center gap-1 py-3 min-h-[44px] relative"
            >
              <div className="relative">
                <Icon
                  size={22}
                  weight={active ? 'fill' : 'duotone'}
                  className={active ? 'text-brand-400' : 'text-dark-800/60 dark:text-white/60'}
                />
                {badgeValue > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-brand-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {badgeValue > 9 ? '9+' : badgeValue}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-brand-400' : 'text-dark-800/60 dark:text-white/60'}`}>
                {label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand-400 transition-transform" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
