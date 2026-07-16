import { Link } from 'react-router-dom'
import {
  ArrowRight,
  MagnifyingGlass,
  ShoppingBagOpen,
  Storefront,
} from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import ProductCard from '../components/ui/ProductCard'
import CustomerReviews from '../components/ui/CustomerReviews'
import UnifiedHeroCarousel from '../components/ui/UnifiedHeroCarousel'
import { useProducts, useNewProducts } from '../hooks/useProducts'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useNavigate } from 'react-router-dom'
import type { Product } from '../types'
import ShopLoader from '../components/ui/ShopLoader'

export default function Home() {
  useDocumentTitle('Home')
  const { data: featured, isError: featuredIsError, error: featuredError, isLoading: featuredLoading } = useProducts({ featured: true })
  const { data: newProducts, isError: newProductsIsError, error: newProductsError, isLoading: newProductsLoading } = useNewProducts(7)
  const { isError: allProductsIsError, error: allProductsError } = useProducts()
  const productsError = allProductsError ?? featuredError ?? newProductsError
  const productsLoadFailed = allProductsIsError || featuredIsError || newProductsIsError
  const settings = useStoreSettings()
  const reduceMotion = useReducedMotion()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // If installed as PWA and they open the default route (/), trap them to their store
    // unless they explicitly cleared it by clicking "Marketplace ↗".
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone)
    if (isStandalone) {
      const lastStore = localStorage.getItem('catalog_last_store')
      if (lastStore) {
        navigate(`/s/${lastStore}`, { replace: true })
      }
    }
  }, [navigate])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchTerm.trim()
    if (!query) return
    navigate(`/shop?q=${encodeURIComponent(query)}`)
  }

  // Hero product showcase — featured first, topped up with new arrivals, deduped.
  const heroShowcase = useMemo(() => {
    const seen = new Set<string>()
    const out: Product[] = []
    for (const p of [...(featured ?? []), ...(newProducts ?? [])]) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        out.push(p)
      }
    }
    return out.slice(0, 6)
  }, [featured, newProducts])

  if (featuredLoading || newProductsLoading) {
    return <ShopLoader />
  }

  return (
    <main className="flex-1">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-7xl mx-auto px-4 pt-6 sm:pt-10"
      >
        <div className="glass rounded-[2rem] border border-brand-400/15 p-4 sm:p-5 shadow-lg shadow-brand-500/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-400/10 border border-brand-400/20 text-[10px] font-extrabold uppercase tracking-[0.28em] text-brand-400 mb-3">
                Search
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-semibold tracking-[-0.02em] text-dark-800 dark:text-white">
                Find a product fast
              </h2>
              <p className="text-xs sm:text-sm text-dark-800/55 dark:text-white/45 mt-1">
                Open the search bar here, type what you need, and jump straight to the catalog.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen(open => !open)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold bg-brand-400 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-500 transition-colors"
            >
              <MagnifyingGlass size={16} weight="bold" />
              {searchOpen ? 'Close search' : 'Search products'}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {searchOpen && (
              <motion.form
                initial={{ height: 0, opacity: 0, y: -8 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                onSubmit={handleSearch}
                className="mt-4 overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <MagnifyingGlass size={18} weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-800/30 dark:text-white/30" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search products, brands, or styles..."
                      className="w-full h-14 rounded-2xl border border-cream-200 dark:border-white/10 bg-white/80 dark:bg-dark-900/60 backdrop-blur px-11 pr-4 text-sm text-dark-800 dark:text-white placeholder:text-dark-800/30 dark:placeholder:text-white/30 outline-none focus:border-brand-400/50 focus:ring-2 focus:ring-brand-400/15 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-14 sm:min-w-[140px] rounded-2xl bg-dark-800 text-white text-sm font-semibold hover:bg-dark-900 transition-colors"
                  >
                    Search now
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Premium Unified Swiper Hero Carousel */}
      <UnifiedHeroCarousel products={heroShowcase} heroImages={settings.hero_images || []} />

      {productsLoadFailed && (
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
            <p className="font-semibold">Products could not load.</p>
            <p className="mt-1 text-red-700/80 dark:text-red-200/80">
              {productsError instanceof Error ? productsError.message : 'Check the Supabase deployment environment variables.'}
            </p>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newProducts && newProducts.length > 0 && (
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="py-10 sm:py-16"
        >
          <div className="max-w-7xl mx-auto px-4 flex items-end justify-between mb-6 sm:mb-10">
            <div>
              <span className="block text-[var(--hero-accent)] text-[11px] uppercase tracking-[0.28em] font-semibold mb-2.5">
                Just Dropped
              </span>
              <h2 className="text-3xl sm:text-5xl font-display font-semibold tracking-[-0.02em] text-dark-800 dark:text-white">
                New Arrivals
              </h2>
            </div>
            <Link
              to="/shop"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-dark-800/70 dark:text-white/70 hover:text-[var(--hero-accent)] transition-colors"
            >
              View all <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {/* Mobile = edge-to-edge swipe rail with snap. Desktop = grid. */}
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {newProducts.slice(0, 8).map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Featured */}
      {featured && featured.length > 0 && (
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="py-10 sm:py-16"
        >
          <div className="max-w-7xl mx-auto px-4 flex items-end justify-between mb-6 sm:mb-10">
            <div>
              <span className="block text-[var(--hero-accent)] text-[11px] uppercase tracking-[0.28em] font-semibold mb-2.5">
                Featured
              </span>
              <h2 className="text-3xl sm:text-5xl font-display font-semibold tracking-[-0.02em] text-dark-800 dark:text-white">
                Featured Products
              </h2>
            </div>
            <Link
              to="/shop"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-dark-800/70 dark:text-white/70 hover:text-[var(--hero-accent)] transition-colors"
            >
              View all <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {featured.slice(0, 8).map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Empty state */}
      {!productsLoadFailed && (!featured || featured.length === 0) && (!newProducts || newProducts.length === 0) && (
        <section className="max-w-7xl mx-auto px-4 py-32 text-center">
          <ShoppingBagOpen size={64} weight="duotone" className="text-brand-400 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold text-dark-800 dark:text-white mb-2">Coming Soon</h2>
          <p className="text-dark-800/50 dark:text-white/50">Products are being added. Check back soon!</p>
        </section>
      )}

      {/* Become a Seller Banner CTA */}
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="py-12 sm:py-20 relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="glass rounded-[2.5rem] border border-brand-400/20 relative overflow-hidden p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-10 shadow-2xl">
            {/* Ambient Background Glow inside the card */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-400/10 via-brand-400/5 to-transparent pointer-events-none" />
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-400/15 rounded-full blur-3xl pointer-events-none" />

            {/* Left Column: Core Copy */}
            <div className="max-w-xl text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-400/10 border border-brand-400/25 text-[10px] font-extrabold uppercase tracking-wider text-brand-400 mb-4 shadow-sm">
                <Storefront size={12} weight="bold" /> Start Selling
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-semibold tracking-[-0.02em] text-dark-800 dark:text-white mb-4 leading-tight">
                Turn your passion into an online business
              </h2>
              <p className="text-sm sm:text-base text-dark-800/60 dark:text-white/60 mb-8 leading-relaxed">
                Create a stunning storefront in under 60 seconds. Customize your shop, upload products, and manage order notifications right into your WhatsApp. No listing fees, no upfront monthly costs.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link
                  to="/sell"
                  className="btn-primary w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-semibold shadow-lg shadow-brand-500/25 hover:shadow-brand-500/35 transition-all"
                >
                  Create Your Store ↗
                </Link>
                <Link
                  to="/shop"
                  className="text-sm font-bold text-dark-800/70 dark:text-white/70 hover:text-brand-400 transition-colors py-2"
                >
                  Explore existing shops
                </Link>
              </div>
            </div>

            {/* Right Column: Visual Features (Isometric Grid) */}
            <div className="grid grid-cols-2 gap-4 w-full lg:max-w-sm">
              <div className="card p-5 border border-brand-400/10 shadow-md">
                <span className="text-xl sm:text-2xl mb-2 block">⚡</span>
                <h3 className="text-sm font-bold text-dark-800 dark:text-white mb-1">Instant Setup</h3>
                <p className="text-[11px] text-dark-800/50 dark:text-white/40 leading-snug">
                  Get a unique shareable store link (/s/slug) in just seconds.
                </p>
              </div>
              <div className="card p-5 border border-brand-400/10 shadow-md translate-y-4">
                <span className="text-xl sm:text-2xl mb-2 block">💬</span>
                <h3 className="text-sm font-bold text-dark-800 dark:text-white mb-1">WhatsApp Orders</h3>
                <p className="text-[11px] text-dark-800/50 dark:text-white/40 leading-snug">
                  Customers checkout and send shopping carts straight to your phone.
                </p>
              </div>
              <div className="card p-5 border border-brand-400/10 shadow-md -translate-y-4">
                <span className="text-xl sm:text-2xl mb-2 block">💰</span>
                <h3 className="text-sm font-bold text-dark-800 dark:text-white mb-1">100% Free</h3>
                <p className="text-[11px] text-dark-800/50 dark:text-white/40 leading-snug">
                  Zero setup or subscription costs to display your inventory.
                </p>
              </div>
              <div className="card p-5 border border-brand-400/10 shadow-md">
                <span className="text-xl sm:text-2xl mb-2 block">📈</span>
                <h3 className="text-sm font-bold text-dark-800 dark:text-white mb-1">Analytics</h3>
                <p className="text-[11px] text-dark-800/50 dark:text-white/40 leading-snug">
                  Monitor unique storefront page visits directly in your dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <CustomerReviews />
    </main>
  )
}
