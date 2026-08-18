import { Link } from 'react-router-dom'
import {
  ArrowRight,
  MagnifyingGlass,
  ShoppingBagOpen,
  Storefront,
} from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import ProductCard from '../components/ui/ProductCard'
import CustomerReviews from '../components/ui/CustomerReviews'
import UnifiedHeroCarousel from '../components/ui/UnifiedHeroCarousel'
import { useProducts, useNewProducts } from '../hooks/useProducts'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useNavigate } from 'react-router-dom'
import type { Product } from '../types'
import ShopLoader from '../components/ui/ShopLoader'
import { formatPrice } from '../lib/utils'
import { useQuery } from '@tanstack/react-query'
import { useCustomerSession } from '../hooks/useCustomerSession'
import { supabase } from '../lib/supabase'

function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function Home() {
  useDocumentTitle('Home')
  const { profile } = useCustomerSession()
  const followedStoreIds = profile?.followed_stores || []

  const { data: followedProducts } = useQuery({
    queryKey: ['followed-shops-products', followedStoreIds],
    queryFn: async () => {
      if (followedStoreIds.length === 0) return []
      const { data, error } = await supabase
        .from('products')
        .select('*, store:stores(markup_percentage, name, slug)')
        .in('store_id', followedStoreIds)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      return data || []
    },
    enabled: followedStoreIds.length > 0
  })

  const { data: featured, isError: featuredIsError, error: featuredError, isLoading: featuredLoading } = useProducts({ featured: true })
  const { data: newProducts, isError: newProductsIsError, error: newProductsError, isLoading: newProductsLoading } = useNewProducts(7)
  const { isError: allProductsIsError, error: allProductsError } = useProducts()
  const productsError = allProductsError ?? featuredError ?? newProductsError
  const productsLoadFailed = allProductsIsError || featuredIsError || newProductsIsError
  const settings = useStoreSettings()
  const reduceMotion = useReducedMotion()
  const navigate = useNavigate()
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

  // Typeahead suggestions
  const debouncedQuery = useDebouncedValue(searchTerm.trim(), 250)
  const showSuggestions = debouncedQuery.length >= 2
  const { data: suggestions = [], isFetching: suggestionsLoading } = useProducts(
    { search: debouncedQuery },
    { enabled: showSuggestions }
  )
  const topSuggestions = useMemo(() => (suggestions ?? []).slice(0, 6), [suggestions])
  const hasNoResults = showSuggestions && !suggestionsLoading && topSuggestions.length === 0
  const suggestionsOpen = showSuggestions && (topSuggestions.length > 0 || hasNoResults)

  const [activeIndex, setActiveIndex] = useState(-1)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const searchRootRef = useRef<HTMLDivElement>(null)

  // Reset highlight whenever the result set changes
  useEffect(() => {
    setActiveIndex(-1)
  }, [debouncedQuery])

  // Open on typing/focus when there are results; close on outside click + Escape
  useEffect(() => {
    if (suggestionsOpen) setDropdownOpen(true)
  }, [suggestionsOpen])

  useEffect(() => {
    if (!dropdownOpen) return
    const onClick = (e: MouseEvent) => {
      if (searchRootRef.current && !searchRootRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [dropdownOpen])

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
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl mx-auto px-4 pt-6 sm:pt-8"
      >
        <div ref={searchRootRef} className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (activeIndex >= 0 && topSuggestions[activeIndex]) {
                const p = topSuggestions[activeIndex]
                setDropdownOpen(false)
                navigate(`/product/${p.slug}`)
                return
              }
              handleSearch(e)
            }}
            role="search"
            className="search-aura"
          >
            <div className="search-aura__inner relative h-12 sm:h-14 rounded-full bg-white/80 dark:bg-white/5 backdrop-blur-xl shadow-sm">
              <MagnifyingGlass
                size={18}
                weight="bold"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-800/40 dark:text-white/40 pointer-events-none"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  if (e.target.value.trim().length >= 2) setDropdownOpen(true)
                }}
                onFocus={() => {
                  if (suggestionsOpen) setDropdownOpen(true)
                }}
                onKeyDown={(e) => {
                  if (!dropdownOpen || topSuggestions.length === 0) return
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setActiveIndex(i => (i + 1) % topSuggestions.length)
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setActiveIndex(i => (i <= 0 ? topSuggestions.length - 1 : i - 1))
                  }
                }}
                placeholder="Search products, brands, or styles..."
                autoComplete="off"
                enterKeyHint="search"
                role="combobox"
                aria-expanded={dropdownOpen}
                aria-autocomplete="list"
                aria-controls="home-search-listbox"
                aria-activedescendant={
                  activeIndex >= 0 ? `home-search-opt-${topSuggestions[activeIndex]?.id}` : undefined
                }
                className="w-full h-full pl-11 pr-4 rounded-full bg-transparent text-base text-dark-800 dark:text-white placeholder:text-dark-800/40 dark:placeholder:text-white/40 outline-none focus:ring-2 focus:ring-brand-400/30 transition-shadow"
              />
            </div>
          </form>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                id="home-search-listbox"
                role="listbox"
                initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute left-0 right-0 top-full mt-2 z-30 rounded-2xl border border-dark-800/10 dark:border-white/10 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl shadow-xl overflow-hidden"
              >
                {topSuggestions.length > 0 ? (
                  <ul className="max-h-[60vh] overflow-y-auto py-1">
                    {topSuggestions.map((p, i) => {
                      const isActive = i === activeIndex
                      const thumb = p.images?.[0]
                      return (
                        <li key={p.id} id={`home-search-opt-${p.id}`} role="option" aria-selected={isActive}>
                          <Link
                            to={`/product/${p.slug}`}
                            onMouseEnter={() => setActiveIndex(i)}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setDropdownOpen(false)
                            }}
                            className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                              isActive ? 'bg-brand-400/10' : 'hover:bg-dark-800/5 dark:hover:bg-white/5'
                            }`}
                          >
                            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-dark-800/5 dark:bg-white/5">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <ShoppingBagOpen size={18} weight="duotone" className="text-dark-800/30 dark:text-white/30" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-dark-800 dark:text-white">
                                {p.title}
                              </span>
                              {p.category && (
                                <span className="block truncate text-xs text-dark-800/55 dark:text-white/45">
                                  {p.category}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-sm font-semibold text-dark-800 dark:text-white">
                              {formatPrice(p.selling_price)}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                ) : hasNoResults ? (
                  <div className="px-4 py-3 text-sm text-dark-800/55 dark:text-white/45">
                    No products found for &ldquo;{debouncedQuery}&rdquo;
                  </div>
                ) : null}
              </motion.div>
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

      {/* ── From Shops You Follow ──────────────────────────────────────────── */}
      {followedProducts && followedProducts.length > 0 && (
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="py-10 sm:py-16"
        >
          <div className="max-w-7xl mx-auto px-4 flex items-end justify-between mb-6 sm:mb-10">
            <div>
              <span className="block text-[var(--hero-accent)] text-[11px] uppercase tracking-[0.28em] font-semibold mb-2.5 flex items-center gap-2">
                <Storefront size={12} weight="fill" /> Followed Sellers
              </span>
              <h2 className="text-3xl sm:text-5xl font-display font-semibold tracking-[-0.02em] text-dark-800 dark:text-white">
                From Shops You Follow
              </h2>
            </div>
            <Link
              to="/account"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-dark-800/70 dark:text-white/70 hover:text-[var(--hero-accent)] transition-colors"
            >
              Manage sellers <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {(followedProducts as any[]).slice(0, 8).map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </motion.section>
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

      {/* Visual Lookbook / Gallery CTA Section */}
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="py-12 sm:py-16 bg-cream-50/30 dark:bg-white/2"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="rounded-[2rem] bg-gradient-to-br from-brand-400/5 to-brand-500/10 border border-brand-400/10 p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-2 text-center md:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-400/10 border border-brand-400/20 text-[10px] font-bold uppercase tracking-wider text-brand-400">
                ✨ LOOKBOOK
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-dark-800 dark:text-white">
                Explore the Visual Gallery
              </h2>
              <p className="text-xs sm:text-sm text-dark-800/60 dark:text-white/60 max-w-xl">
                Prefer a high-density, image-first catalog view? Browse the collection in grid, magazine, or compact list layouts to find inspiration.
              </p>
            </div>
            <Link
              to="/gallery"
              className="w-full md:w-auto px-6 py-3 bg-brand-400 hover:bg-brand-500 text-white font-semibold rounded-xl text-sm text-center shadow-md transition-colors whitespace-nowrap"
            >
              Open Gallery View
            </Link>
          </div>
        </div>
      </motion.section>

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
