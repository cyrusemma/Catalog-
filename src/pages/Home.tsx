import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ShoppingBagOpen,
} from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo } from 'react'
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

  if (featuredLoading || newProductsLoading) {
    return <ShopLoader />
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

  return (
    <main className="flex-1">
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

      <CustomerReviews />
    </main>
  )
}
