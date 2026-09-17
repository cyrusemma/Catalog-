import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  CaretRight,
  ChartLineUp,
  Images,
  Lightning,
  MagnifyingGlass,
  RocketLaunch,
  SealCheck,
  ShoppingBagOpen,
  Storefront,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ProductCard from '../components/ui/ProductCard'
import CustomerReviews from '../components/ui/CustomerReviews'
import UnifiedHeroCarousel from '../components/ui/UnifiedHeroCarousel'
import ShopLoader from '../components/ui/ShopLoader'
import { useProducts, useNewProducts } from '../hooks/useProducts'
import { useCatalogSearch } from '../hooks/useCatalogSearch'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useCustomerSession } from '../hooks/useCustomerSession'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/utils'
import type { Product } from '../types'
import SEOHead from '../components/layout/SEOHead'

export default function Home() {
  const settings = useStoreSettings()
  const storeName = settings.store_name || 'Catalog by Cyrus'
  const storeTagline = settings.tagline || 'Discover Amazing Products'

  const storeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: storeName,
    description: storeTagline,
    url: typeof window !== 'undefined' ? window.location.origin : 'https://catalog.cyrus.com',
    telephone: settings.whatsapp_number || undefined,
    currenciesAccepted: settings.currency || 'GHS',
    paymentAccepted: 'Mobile Money, Cash on Delivery, Bank Transfer',
    priceRange: '$$',
  }

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
  const { data: allProducts = [], isError: allProductsIsError, error: allProductsError } = useProducts()
  const productsError = allProductsError ?? featuredError ?? newProductsError
  const productsLoadFailed = allProductsIsError || featuredIsError || newProductsIsError
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

  const {
    searchTerm,
    setSearchTerm,
    debouncedQuery,
    searchResults,
  } = useCatalogSearch(allProducts, {
    debounceMs: 150,
    enableFuzzy: true,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchTerm.trim()
    if (!query) return
    navigate(`/shop?q=${encodeURIComponent(query)}`)
  }

  // Typeahead suggestions from Trie & Fuzzy search engine
  const showSuggestions = debouncedQuery.length >= 2
  const topSuggestions = useMemo(() => {
    if (!showSuggestions) return []
    return searchResults.slice(0, 6)
  }, [showSuggestions, searchResults])

  const hasNoResults = showSuggestions && topSuggestions.length === 0
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
      <SEOHead
        title={storeName}
        description={storeTagline}
        schemaData={storeSchema}
      />
      <h1 className="sr-only">{storeName} — {storeTagline}</h1>

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl mx-auto px-4 pt-6 sm:pt-8 relative z-40"
      >
        <div ref={searchRootRef} className="relative z-40">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (activeIndex >= 0 && topSuggestions[activeIndex]) {
                const p = topSuggestions[activeIndex]
                setDropdownOpen(false)
                navigate(`/product/${p.slug || p.id}`)
                return
              }
              setDropdownOpen(false)
              handleSearch(e)
            }}
            role="search"
            className="search-aura"
          >
            <div className="search-aura__inner relative h-12 sm:h-14 rounded-full bg-white/90 dark:bg-white/5 backdrop-blur-xl shadow-sm flex items-center">
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
                  if (searchTerm.trim().length >= 2) setDropdownOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setDropdownOpen(false)
                    return
                  }
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
                className="w-full h-full pl-11 pr-10 rounded-full bg-transparent text-base text-dark-800 dark:text-white placeholder:text-dark-800/40 dark:placeholder:text-white/40 outline-none focus:ring-2 focus:ring-brand-400/30 transition-shadow"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setDropdownOpen(false)
                  }}
                  aria-label="Clear search"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-dark-800/40 dark:text-white/40 hover:text-dark-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
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
                className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-dark-800/10 dark:border-white/10 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
              >
                {topSuggestions.length > 0 ? (
                  <ul className="max-h-[60vh] overflow-y-auto py-1">
                    {topSuggestions.map((p, i) => {
                      const isActive = i === activeIndex
                      const thumb = p.images?.[0]
                      return (
                        <li key={p.id} id={`home-search-opt-${p.id}`} role="option" aria-selected={isActive}>
                          <Link
                            to={`/product/${p.slug || p.id}`}
                            onMouseEnter={() => setActiveIndex(i)}
                            onMouseDown={(e) => {
                              // Stop mousedown from triggering document-level blur/close before click
                              e.stopPropagation()
                            }}
                            onClick={() => {
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
                <Images size={13} weight="bold" /> LOOKBOOK
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

      {/* Become a Seller Banner CTA - Classic Luxury Redesign */}
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="py-14 sm:py-24 relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="relative rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 lg:p-16 border border-amber-500/25 dark:border-amber-500/20 bg-gradient-to-br from-[#1c1209] via-[#140b04] to-[#0a0502] text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-12">
            
            {/* Ambient Lighting & Glow Flares */}
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-600/10 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(217,119,6,0.08),transparent_60%)] pointer-events-none" />

            {/* Left Column: Core Copy & CTAs */}
            <div className="max-w-xl text-center lg:text-left relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] font-bold uppercase tracking-widest mb-5 backdrop-blur-md shadow-xs">
                <Storefront size={13} weight="fill" className="text-amber-400" />
                <span>For Creators &amp; Merchants</span>
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.12] mb-5">
                Turn your passion into an{' '}
                <span className="italic font-serif bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
                  online business
                </span>
              </h2>

              <p className="text-sm sm:text-base text-[#e5d8c5]/80 mb-8 leading-relaxed font-light">
                Launch your branded digital storefront in under 60 seconds. Upload products, share your unique boutique link, and receive verified customer orders directly to your WhatsApp with zero listing fees.
              </p>

              {/* Value Badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3 mb-9">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-amber-200/90">
                  <Lightning size={14} weight="fill" className="text-amber-400" />
                  60-Second Setup
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-amber-200/90">
                  <WhatsappLogo size={14} weight="fill" className="text-emerald-400" />
                  WhatsApp Orders
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-amber-200/90">
                  <SealCheck size={14} weight="fill" className="text-amber-400" />
                  100% Free to Start
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link
                  to="/sell"
                  className="group w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-dark-950 font-extrabold text-sm tracking-wide shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:scale-95"
                >
                  <span>Create Your Store</span>
                  <ArrowUpRight size={18} weight="bold" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>

                <Link
                  to="/shop"
                  className="w-full sm:w-auto px-6 py-4 rounded-2xl border border-white/15 hover:border-amber-400/40 bg-white/5 hover:bg-white/10 text-white/90 hover:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 backdrop-blur-md"
                >
                  <span>Explore Existing Shops</span>
                  <CaretRight size={16} />
                </Link>
              </div>
            </div>

            {/* Right Column: Luxury Interactive Showcase Card & Bento */}
            <div className="w-full lg:max-w-md space-y-4 relative z-10">
              {/* Storefront Mock Preview Card */}
              <div className="bg-white/[0.05] border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-mono text-amber-200/80 truncate">catalog.com/s/your-store</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                    ACTIVE STORE
                  </span>
                </div>

                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-md flex-shrink-0">
                    <div className="w-full h-full bg-[#1c1209] rounded-[14px] flex items-center justify-center text-amber-400 font-serif text-lg font-bold">
                      B
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-serif text-sm font-bold text-white truncate">Bella Boutique</h4>
                      <SealCheck size={16} weight="fill" className="text-amber-400 flex-shrink-0" />
                    </div>
                    <p className="text-[11px] text-[#e5d8c5]/60 mt-0.5">Luxury Apparel &amp; Accessories</p>
                  </div>
                </div>

                {/* WhatsApp Order Notification Simulation */}
                <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-2xl p-3.5 flex items-start gap-3 shadow-inner">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                    <WhatsappLogo size={18} weight="fill" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-emerald-300">New WhatsApp Order</p>
                      <span className="text-[10px] text-emerald-400/70 font-mono">Just now</span>
                    </div>
                    <p className="text-xs font-medium text-white/90 truncate mt-0.5">
                      Silk Satin Slip Dress (GH₵ 280.00)
                    </p>
                  </div>
                </div>
              </div>

              {/* Bento Feature Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 hover:border-amber-400/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-2.5">
                    <RocketLaunch size={18} weight="duotone" />
                  </div>
                  <h5 className="text-xs font-bold text-white mb-0.5">Instant Setup</h5>
                  <p className="text-[11px] text-[#e5d8c5]/60 leading-relaxed">
                    Custom link ready in under 60 seconds.
                  </p>
                </div>

                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 hover:border-amber-400/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-2.5">
                    <ChartLineUp size={18} weight="duotone" />
                  </div>
                  <h5 className="text-xs font-bold text-white mb-0.5">Live Analytics</h5>
                  <p className="text-[11px] text-[#e5d8c5]/60 leading-relaxed">
                    Track visitor counts and order trends.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </motion.section>

      <CustomerReviews />
    </main>
  )
}
