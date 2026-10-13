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
    url: typeof window !== 'undefined' ? window.location.origin : 'https://ccatalog.store',
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

  // Extract up to 3 distinct product images for the editorial lookbook preview stack
  const lookbookImages = useMemo(() => {
    const list: string[] = []
    const pool = [...(allProducts || []), ...(featured || []), ...(newProducts || [])]
    for (const p of pool) {
      if (p.images && p.images[0] && !list.includes(p.images[0])) {
        list.push(p.images[0])
        if (list.length === 3) break
      }
    }
    return list
  }, [allProducts, featured, newProducts])

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

      {/* Visual Lookbook / Gallery CTA Section — Editorial Magazine Redesign */}
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="py-12 sm:py-18"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-cream-100/90 via-cream-50 to-white dark:from-[#16120e] dark:via-dark-900 dark:to-dark-900 border border-dark-800/8 dark:border-white/10 p-7 sm:p-10 lg:p-12 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-12">
            
            {/* Subtle Warm Ambient Glow */}
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-brand-400/10 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-brand-500/10 dark:bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

            {/* Left Column: Editorial Copy & Action */}
            <div className="space-y-4 text-center lg:text-left relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-brand-400/10 dark:bg-white/10 border border-brand-400/20 dark:border-white/15 text-[11px] font-bold uppercase tracking-widest text-brand-600 dark:text-amber-300 backdrop-blur-sm">
                <Images size={13} weight="bold" /> CURATED LOOKBOOK
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-dark-800 dark:text-white tracking-tight leading-tight">
                Explore the Visual Gallery
              </h2>
              <p className="text-xs sm:text-sm text-dark-800/70 dark:text-white/70 leading-relaxed">
                Prefer an image-first, high-density catalog view? Browse full collections in grid, magazine, or compact list layouts to discover your next favorite piece.
              </p>
              <div className="pt-2 flex justify-center lg:justify-start">
                <Link
                  to="/gallery"
                  className="group inline-flex items-center gap-2 px-7 py-3.5 bg-dark-900 hover:bg-dark-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-dark-900 font-bold rounded-2xl text-sm shadow-lg shadow-black/10 dark:shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
                >
                  <span>Open Visual Gallery</span>
                  <ArrowRight size={16} weight="bold" className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Right Column: Editorial Overlapping Image Stack */}
            <div className="relative flex items-center justify-center shrink-0 z-10 py-4 lg:py-2">
              {lookbookImages.length > 0 ? (
                <div className="flex items-center -space-x-8 sm:-space-x-12 hover:space-x-2 transition-all duration-500 py-3">
                  {lookbookImages.map((src, i) => {
                    const rotations = [
                      '-rotate-6 translate-y-2',
                      'rotate-0 -translate-y-2 z-10 scale-105',
                      'rotate-6 translate-y-2',
                    ]
                    return (
                      <div
                        key={i}
                        className={`relative w-24 sm:w-32 lg:w-36 aspect-[3/4] rounded-2xl overflow-hidden shadow-xl border-2 border-white dark:border-dark-800 transform transition-all duration-300 hover:scale-110 hover:z-20 hover:rotate-0 hover:shadow-2xl ${rotations[i] || ''}`}
                      >
                        <img
                          src={src}
                          alt={`Lookbook curation ${i + 1}`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="w-48 h-32 rounded-2xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center text-brand-400">
                  <Images size={36} weight="duotone" />
                </div>
              )}
            </div>

          </div>
        </div>
      </motion.section>

      {/* ── Create Your Store — High-Conversion CTA ─────────────────────────── */}
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="py-14 sm:py-24 relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="relative rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 lg:p-16 overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-12"
            style={{
              background: 'linear-gradient(135deg, #0f0a04 0%, #1a0f04 40%, #120d06 70%, #0a0602 100%)',
              boxShadow: '0 32px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(180,110,20,0.18)',
            }}
          >
            {/* Ambient light — warm upper-left, cool lower-right */}
            <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(214,128,10,0.18) 0%, transparent 70%)' }} />
            <div className="absolute -bottom-24 -right-24 w-[320px] h-[320px] rounded-full blur-[90px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,120,80,0.10) 0%, transparent 70%)' }} />
            {/* Fine grain texture overlay */}
            <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '150px' }} />

            {/* Left: Copy + CTAs */}
            <div className="max-w-xl text-center lg:text-left relative z-10">

              {/* Social proof pill — scarcity/trust */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 border border-amber-400/20" style={{ background: 'rgba(214,128,10,0.10)' }}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-[11px] font-bold text-amber-300/90 uppercase tracking-widest">Free · No Commission · Open Now</span>
              </div>

              {/* Headline — benefit-led */}
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[2.8rem] font-normal tracking-tight text-white leading-[1.1] mb-4">
                Your products deserve{' '}
                <span className="italic" style={{ background: 'linear-gradient(90deg, #fde68a, #f59e0b, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  their own store.
                </span>
              </h2>

              <p className="text-[15px] text-white/55 mb-8 leading-relaxed font-light max-w-md mx-auto lg:mx-0">
                Launch in under 60 seconds. Share your link, get orders straight to WhatsApp — completely free, forever.
              </p>

              {/* Benefit pills */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-9">
                {[
                  { icon: <Lightning size={13} weight="fill" className="text-amber-400" />, text: '60-Second Setup' },
                  { icon: <WhatsappLogo size={13} weight="fill" className="text-emerald-400" />, text: 'Orders to WhatsApp' },
                  { icon: <SealCheck size={13} weight="fill" className="text-amber-400" />, text: 'Zero Listing Fees' },
                  { icon: <ChartLineUp size={13} weight="fill" className="text-sky-400" />, text: 'Live Analytics' },
                ].map(({ icon, text }) => (
                  <span key={text} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium text-white/70 border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {icon}
                    {text}
                  </span>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                <Link
                  to="/sell"
                  className="group w-full sm:w-auto px-8 py-4 rounded-2xl font-extrabold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)',
                    color: '#0a0602',
                    boxShadow: '0 8px 32px rgba(214,128,10,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  <Storefront size={17} weight="fill" />
                  <span>Create Your Free Store</span>
                  <ArrowUpRight size={17} weight="bold" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>

                <Link
                  to="/shop"
                  className="w-full sm:w-auto px-6 py-4 rounded-2xl border font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(214,128,10,0.35)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.90)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)' }}
                >
                  <span>Browse Existing Shops</span>
                  <CaretRight size={15} />
                </Link>
              </div>

              {/* Micro-trust line */}
              <p className="mt-5 text-[11px] text-white/25 text-center lg:text-left">
                Trusted by merchants across Ghana · No credit card needed
              </p>
            </div>

            {/* Right: Mock store card */}
            <div className="w-full lg:max-w-[380px] space-y-3 relative z-10">

              {/* Store card */}
              <div className="rounded-3xl p-5 backdrop-blur-xl border border-white/[0.08] shadow-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.07]">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                    </div>
                    <span className="text-[11px] font-mono truncate" style={{ color: 'rgba(253,230,138,0.75)' }}>catalog.com/s/your-store</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider flex-shrink-0 border border-emerald-500/30" style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7' }}>
                    LIVE
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl p-0.5 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #fde68a)' }}>
                    <div className="w-full h-full rounded-[10px] flex items-center justify-center font-serif text-base font-bold" style={{ background: '#1a0f04', color: '#f59e0b' }}>
                      B
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-serif text-sm font-bold text-white truncate">Bella Boutique</h4>
                      <SealCheck size={15} weight="fill" style={{ color: '#f59e0b', flexShrink: 0 }} />
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(229,216,197,0.50)' }}>Luxury Apparel &amp; Accessories</p>
                  </div>
                </div>

                {/* WhatsApp notification */}
                <div className="rounded-2xl p-3 flex items-start gap-3 border border-emerald-500/20" style={{ background: 'rgba(6,78,59,0.35)' }}>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                    <WhatsappLogo size={16} weight="fill" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[11px] font-bold" style={{ color: '#6ee7b7' }}>New Order 🎉</p>
                      <span className="text-[10px] font-mono" style={{ color: 'rgba(110,231,183,0.55)' }}>Just now</span>
                    </div>
                    <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.80)' }}>Silk Satin Slip Dress — GH₵ 280.00</p>
                  </div>
                </div>
              </div>

              {/* Bento grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { Icon: RocketLaunch, title: 'Instant Setup', desc: 'Live in under 60 sec.' },
                  { Icon: ChartLineUp, title: 'Live Analytics', desc: 'Track visits & orders.' },
                ].map(({ Icon, title, desc }) => (
                  <div key={title} className="rounded-2xl p-4 border border-white/[0.07] hover:border-amber-400/25 transition-all group" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="w-8 h-8 rounded-xl mb-2.5 flex items-center justify-center border border-amber-500/20" style={{ background: 'rgba(214,128,10,0.10)', color: '#f59e0b' }}>
                      <Icon size={17} weight="duotone" />
                    </div>
                    <h5 className="text-xs font-bold text-white mb-0.5">{title}</h5>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(229,216,197,0.50)' }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </motion.section>

      <CustomerReviews />
    </main>
  )
}
