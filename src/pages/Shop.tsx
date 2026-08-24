import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom'
import { MagnifyingGlass, Faders, MagnifyingGlassMinus, CaretRight, ArrowRight, X, SquaresFour, GridNine, Rows } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import ProductCard from '../components/ui/ProductCard'
import SkeletonCard from '../components/ui/SkeletonCard'
import InfiniteScrollSentinel from '../components/ui/InfiniteScrollSentinel'

type LayoutMode = 'grid' | 'magazine' | 'compact'

const layoutButtons: { mode: LayoutMode; Icon: typeof SquaresFour; label: string }[] = [
  { mode: 'grid',     Icon: SquaresFour, label: 'Grid' },
  { mode: 'magazine', Icon: Rows,        label: 'Magazine' },
  { mode: 'compact',  Icon: GridNine,    label: 'Compact' },
]

import {
  useProducts,
  useCategoryTree,
  useProductCategoryRefs,
  topLevelCategories,
  childCategories,
  expandCategoryIds,
} from '../hooks/useProducts'
import { useCatalogSearch } from '../hooks/useCatalogSearch'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useStoreContext } from '../contexts/StoreContext'

import type { Product } from '../types'


type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'featured'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'featured', label: 'Featured first' },
  { value: 'price-asc', label: 'Price: low → high' },
  { value: 'price-desc', label: 'Price: high → low' },
]

const PRODUCT_CHUNK_SIZE = 10

const defaultFilters = {
  sort: 'newest' as SortOption,
  minPrice: '',
  maxPrice: '',
  inStockOnly: false,
  freeDeliveryOnly: false,
  preorderOnly: false,
  excludePreorders: false,
}

export default function Shop() {
  useDocumentTitle('Shop')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const navType = useNavigationType()
  const params = useParams<{ parentSlug?: string; subSlug?: string }>()
  const [query, setQuery] = useState('')
  const [layout, setLayout] = useState<LayoutMode>('grid')
  const pendingScrollRef = useRef<number | null>(null)
  const { data: categoryTree } = useCategoryTree()
  const { data: productCategoryRefs } = useProductCategoryRefs()

  // Pretty-URL routing: /shop, /shop/electronics, /shop/electronics/phones-tablets
  const parentSlug = params.parentSlug ?? null
  const subSlug = params.subSlug ?? null

  // Pick up `?q=` from the welcome popup (or any deep link) and seed the search
  // once on mount / when the query string changes. After seeding, the URL param
  // is cleared so it doesn't fight the user's own typing.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('q')
    if (q && q.trim()) {
      setSearch(q.trim())
      setQuery(q.trim())
      navigate(location.pathname, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const parents = topLevelCategories(categoryTree)
  const activeParent = parents.find(p => p.slug === parentSlug)
  const subs = activeParent ? childCategories(categoryTree, activeParent.id) : []
  const activeSub = subs.find(s => s.slug === subSlug)

  const productCategoryIds = useMemo(
    () => new Set((productCategoryRefs ?? []).map(ref => ref.category_id).filter(Boolean) as string[]),
    [productCategoryRefs],
  )

  const productCategoryNames = useMemo(
    () => new Set((productCategoryRefs ?? []).map(ref => ref.category?.trim().toLowerCase()).filter(Boolean) as string[]),
    [productCategoryRefs],
  )

  const categoryHasDirectProducts = useMemo(() => {
    return (categoryId: string, categoryName: string) =>
      productCategoryIds.has(categoryId) || productCategoryNames.has(categoryName.trim().toLowerCase())
  }, [productCategoryIds, productCategoryNames])

  const visibleParents = useMemo(() => {
    return parents.filter(parent => {
      if (categoryHasDirectProducts(parent.id, parent.name)) return true
      return childCategories(categoryTree, parent.id).some(child => categoryHasDirectProducts(child.id, child.name))
    })
  }, [parents, categoryTree, categoryHasDirectProducts])

  const visibleSubs = useMemo(() => {
    return subs.filter(sub => categoryHasDirectProducts(sub.id, sub.name))
  }, [subs, categoryHasDirectProducts])

  const categoryIds = useMemo(() => {
    if (activeSub) return [activeSub.id]
    if (activeParent) return expandCategoryIds(categoryTree, activeParent.id)
    return undefined
  }, [activeParent, activeSub, categoryTree])

  const [filters, setFilters] = useState(defaultFilters)
  const [filterOpen, setFilterOpen] = useState(false)

  const activeFilterCount =
    (filters.sort !== 'newest' ? 1 : 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.freeDeliveryOnly ? 1 : 0) +
    (filters.preorderOnly ? 1 : 0) +
    (filters.excludePreorders ? 1 : 0)

  const storeContext = useStoreContext()
  const storeId = storeContext.storeId

  // Fetch product catalog
  const { data: allProducts, isLoading, isError: productsIsError, error: productsError } = useProducts(
    { storeId: storeId ?? undefined }
  )

  // Trie-based search and ranking engine
  const {
    searchResults,
  } = useCatalogSearch(allProducts, {
    initialQuery: query,
    categoryIds,
    storeId: storeId ?? undefined,
    debounceMs: 150,
    enableFuzzy: true,
  })

  // Apply price / stock / delivery filters then sort (preserving search ranking if newest)
  const visibleProducts = useMemo(() => {
    if (!allProducts) return undefined
    let result = (query || (categoryIds && categoryIds.length > 0)) ? searchResults : allProducts

    if (!query && categoryIds && categoryIds.length > 0) {
      const catSet = new Set(categoryIds)
      result = result.filter(p => p.category_id && catSet.has(p.category_id))
    }

    const min = filters.minPrice ? parseFloat(filters.minPrice) : null
    const max = filters.maxPrice ? parseFloat(filters.maxPrice) : null
    if (min !== null && !Number.isNaN(min)) result = result.filter(p => p.selling_price >= min)
    if (max !== null && !Number.isNaN(max)) result = result.filter(p => p.selling_price <= max)
    if (filters.inStockOnly) result = result.filter(p => p.stock_status !== 'out_of_stock')
    if (filters.freeDeliveryOnly) result = result.filter(p => Number(p.delivery_fee) === 0)
    if (filters.preorderOnly) result = result.filter(p => p.is_preorder)
    if (filters.excludePreorders) result = result.filter(p => !p.is_preorder)

    switch (filters.sort) {
      case 'price-asc':
        result = [...result].sort((a, b) => a.selling_price - b.selling_price)
        break
      case 'price-desc':
        result = [...result].sort((a, b) => b.selling_price - a.selling_price)
        break
      case 'featured':
        result = [...result].sort((a, b) => Number(b.is_featured) - Number(a.is_featured))
        break
      case 'newest':
        // If not searching, sort newest first; if searching, retain Trie relevance score ranking
        if (!query) {
          result = [...result].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        }
        break
    }
    return result
  }, [allProducts, searchResults, query, categoryIds, filters])

  // Group products by category for the "All" Netflix-style browse view
  const productsByCategory = useMemo(() => {
    const map = new Map<string, { name: string; products: Product[] }>()
    if (!visibleProducts) return map
    for (const p of visibleProducts) {
      const cat = categoryTree?.find(c => c.id === p.category_id)
      const key = cat?.parent_id ?? cat?.id ?? 'other'
      const name = categoryTree?.find(c => c.id === key)?.name ?? p.category ?? 'Other'
      if (!map.has(key)) map.set(key, { name, products: [] })
      map.get(key)!.products.push(p)
    }
    return map
  }, [visibleProducts, categoryTree])

  const showRowsView = !activeParent && !query && activeFilterCount === 0 && productsByCategory.size > 1

  // On Back/Forward,
  // restore the saved scroll position so the shopper
  // lands exactly where they left off.
  useEffect(() => {
    if (navType === 'POP') {
      const saved = sessionStorage.getItem(`shop-scroll:${location.pathname}`)
      if (saved) {
        try {
          const { scrollY } = JSON.parse(saved) as { scrollY?: number }
          if (typeof scrollY === 'number') pendingScrollRef.current = scrollY
          return
        } catch {
          // fall through to reset
        }
      }
    }
  }, [
    parentSlug,
    subSlug,
    query,
    filters.sort,
    filters.minPrice,
    filters.maxPrice,
    filters.inStockOnly,
    filters.freeDeliveryOnly,
    navType,
    location.pathname,
  ])

  // After products render, restore scroll position if we have one pending.
  useEffect(() => {
    if (pendingScrollRef.current === null) return
    if (!visibleProducts) return
    const y = pendingScrollRef.current
    pendingScrollRef.current = null
    // Two RAFs to ensure layout has fully settled (images may still be loading)
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)))
  }, [visibleProducts])

  // Persist scroll position so Back/Forward can restore it.
  useEffect(() => {
    let timer: number | null = null
    const save = () => {
      if (timer !== null) return
      timer = window.setTimeout(() => {
        sessionStorage.setItem(
          `shop-scroll:${location.pathname}`,
          JSON.stringify({ scrollY: window.scrollY }),
        )
        timer = null
      }, 200)
    }
    window.addEventListener('scroll', save, { passive: true })
    return () => {
      window.removeEventListener('scroll', save)
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [location.pathname])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(search)
  }

  const handleClearSearch = () => {
    setSearch('')
    setQuery('')
  }

  const handleParentChange = (slug: string | null) => {
    navigate(slug ? `/shop/${slug}` : '/shop')
  }

  const handleSubChange = (slug: string | null) => {
    if (!activeParent) return
    navigate(slug ? `/shop/${activeParent.slug}/${slug}` : `/shop/${activeParent.slug}`)
  }

  const breadcrumbItems = [
    { label: 'Shop', onClick: () => handleParentChange(null) },
    ...(activeParent ? [{ label: activeParent.name, onClick: () => handleParentChange(activeParent.slug) }] : []),
    ...(activeSub ? [{ label: activeSub.name, onClick: () => handleSubChange(activeSub.slug) }] : []),
  ]

  const visibleGridProducts = visibleProducts ?? []
  const hasMoreGridProducts = false

  const canLoadMore = hasMoreGridProducts

  const handleReachEnd = () => {
    // End reached
  }

  const gridClass = {
    grid:     'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4',
    magazine: 'grid grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4',
    compact:  'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2',
  }[layout]

  const isFeatured = (index: number) => layout === 'magazine' && index % 5 === 0

  return (
    <main className="w-full flex-1 max-w-7xl mx-auto px-4 py-5 sm:py-10 pb-28 lg:pb-10">
      {/* Header */}
      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl sm:text-5xl font-display font-semibold tracking-[-0.02em] text-dark-800 dark:text-white mb-1 sm:mb-2">
          Shop
        </h1>
        <p className="text-dark-800/50 dark:text-white/40 text-xs sm:text-sm mt-2 sm:mt-4">
          {visibleProducts ? `Browse ${visibleProducts.length} product${visibleProducts.length !== 1 ? 's' : ''}` : 'Loading...'}
          {activeFilterCount > 0 && visibleProducts && allProducts && visibleProducts.length !== allProducts.length && (
            <span className="text-brand-400 ml-1">({allProducts.length - visibleProducts.length} hidden by filters)</span>
          )}
        </p>
      </div>

      {breadcrumbItems.length > 1 && (
        <nav aria-label="Category path" className="mb-4 -mt-2 flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1
            return (
              <div key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <CaretRight size={12} weight="bold" className="text-dark-800/30 dark:text-white/25" />}
                <button
                  type="button"
                  onClick={item.onClick}
                  disabled={isLast}
                  className={`font-medium transition-colors ${
                    isLast
                      ? 'text-brand-400 cursor-default'
                      : 'text-dark-800/50 dark:text-white/45 hover:text-brand-400'
                  }`}
                >
                  {item.label}
                </button>
              </div>
            )
          })}
        </nav>
      )}

      {/* Sticky filter bar on mobile (search + categories stay pinned under navbar) */}
      <div className="sticky top-16 z-30 -mx-4 px-4 pt-3 pb-3 mb-4 sm:mb-6 bg-cream-50/90 dark:bg-dark-900/85 backdrop-blur-xl lg:static lg:bg-transparent lg:dark:bg-transparent lg:backdrop-blur-none lg:p-0 lg:mx-0">
        {/* Search + Filter */}
        <div className="flex gap-2 sm:gap-3 mb-3 sm:mb-4">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-400 dark:text-white/30" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setQuery(e.target.value)
              }}
              className="input pl-9 pr-8 py-2.5 sm:py-3 text-sm w-full"
            />
            {search && (
              <button
                type="button"
                title="Clear search"
                aria-label="Clear search"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-800/40 dark:text-white/40 hover:text-dark-800 dark:hover:text-white transition-colors"
              >
                <X size={15} weight="bold" />
              </button>
            )}
          </form>
          <button
            type="button"
            aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
            onClick={() => setFilterOpen(true)}
            className="relative glass px-3.5 rounded-xl flex items-center gap-2 text-dark-800/60 dark:text-white/60 hover:text-brand-400 transition-colors"
          >
            <Faders size={16} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-brand-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-amber-glow">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Top-level category pills */}
        <div className="relative -mx-4 lg:mx-0">
          {/* Left fade — signals content behind the sticky filter area */}
          <div
            aria-hidden="true"
            className="lg:hidden pointer-events-none absolute left-0 top-0 bottom-1 w-6 z-10 bg-gradient-to-r from-cream-50/95 dark:from-dark-900/95 to-transparent"
          />
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-4 lg:px-0 scroll-smooth snap-x snap-mandatory overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <button
              type="button"
              onClick={() => handleParentChange(null)}
              className={`flex-shrink-0 snap-start px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                !activeParent
                  ? 'bg-gradient-to-r from-brand-400 to-brand-500 text-white shadow-amber-glow'
                  : 'glass text-dark-800/70 dark:text-white/60 hover:text-brand-400'
              }`}
            >
              All
            </button>
            {visibleParents.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleParentChange(cat.slug)}
                className={`flex-shrink-0 snap-start px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  activeParent?.id === cat.id
                    ? 'bg-gradient-to-r from-brand-400 to-brand-500 text-white shadow-amber-glow'
                    : 'glass text-dark-800/70 dark:text-white/60 hover:text-brand-400'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          {/* Right fade + chevron scroll hint — same as sub-category row */}
          <div
            aria-hidden="true"
            className="lg:hidden pointer-events-none absolute right-0 top-0 bottom-1 w-14 flex items-center justify-end pr-1 bg-gradient-to-l from-cream-50/95 dark:from-dark-900/95 via-cream-50/70 dark:via-dark-900/70 to-transparent"
          >
            <CaretRight size={14} weight="bold" className="text-brand-400 animate-pulse" />
          </div>
        </div>

        {/* Sub-category pills (only when a parent is selected and it has sub-categories) */}
        {activeParent && visibleSubs.length > 0 && (
          <div className="relative -mx-4 lg:mx-0 mt-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide px-4 lg:px-0 scroll-smooth snap-x snap-proximity overscroll-x-contain [-webkit-overflow-scrolling:touch]">
              <button
                type="button"
                onClick={() => handleSubChange(null)}
                className={`flex-shrink-0 snap-start px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium transition-all ${
                  !activeSub
                    ? 'bg-brand-400/15 text-brand-400 border border-brand-400/30'
                    : 'bg-transparent text-dark-800/55 dark:text-white/50 border border-cream-200 dark:border-white/10 hover:border-brand-400/30'
                }`}
              >
                All {activeParent.name}
              </button>
              {visibleSubs.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSubChange(s.slug)}
                  className={`flex-shrink-0 snap-start px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium transition-all ${
                    activeSub?.id === s.id
                      ? 'bg-brand-400/15 text-brand-400 border border-brand-400/30'
                      : 'bg-transparent text-dark-800/55 dark:text-white/50 border border-cream-200 dark:border-white/10 hover:border-brand-400/30'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            {/* Fade + chevron hint to match parent row */}
            <div
              aria-hidden="true"
              className="lg:hidden pointer-events-none absolute right-0 top-0 bottom-1 w-10 bg-gradient-to-l from-cream-50/95 dark:from-dark-900/95 to-transparent"
            />
          </div>
        )}
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="relative -mx-4 lg:mx-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pb-2 px-4 lg:px-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} compact />
            ))}
          </div>
        </div>
      )}

      {productsIsError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
          <p className="font-semibold">Products could not load.</p>
          <p className="mt-1 text-red-700/80 dark:text-red-200/80">
            {productsError instanceof Error ? productsError.message : 'Check the Supabase deployment environment variables.'}
          </p>
        </div>
      )}

      {/* Netflix-style category rows (shown when "All" is selected, no search) */}
      {!isLoading && !productsIsError && showRowsView && (
        <div className="space-y-8 sm:space-y-10">
          {[...productsByCategory.entries()].map(([catId, { name, products: prods }]) => {
            const parent = categoryTree?.find(c => c.id === catId)
            return (
              <section key={catId}>
                <div className="flex items-end justify-between mb-3 sm:mb-4">
                  <h2 className="text-lg sm:text-2xl font-display font-semibold tracking-[-0.02em] text-dark-800 dark:text-white">
                    {name}
                  </h2>
                  {parent?.slug && prods.length > PRODUCT_CHUNK_SIZE && (
                    <button
                      type="button"
                      onClick={() => handleParentChange(parent.slug)}
                      className="text-brand-400 text-xs sm:text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all flex-shrink-0"
                    >
                      See all {prods.length} <ArrowRight size={12} weight="bold" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {prods.slice(0, PRODUCT_CHUNK_SIZE).map((p, i) => (
                    <ProductCard key={p.id} product={p} index={i} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Filtered shelf — vertical grid with infinite scroll (category / search / filters active) */}
      {!isLoading && !productsIsError && !showRowsView && visibleProducts && visibleProducts.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-3 sm:mb-4 gap-4 flex-wrap">
            <div>
              <h2 className="text-lg sm:text-2xl font-display font-semibold tracking-[-0.02em] text-dark-800 dark:text-white">
                {activeSub?.name || activeParent?.name || (query ? 'Search results' : 'Products')}
              </h2>
              <p className="text-xs text-dark-800/45 dark:text-white/40 mt-1">
                {visibleGridProducts.length} / {visibleProducts.length}
              </p>
            </div>
            
            {/* Layout Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-cream-100 dark:bg-white/5 border border-cream-200 dark:border-white/10">
              {layoutButtons.map(({ mode, Icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  aria-label={`Switch to ${label} layout`}
                  title={label}
                  onClick={() => setLayout(mode)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    layout === mode
                      ? 'bg-white dark:bg-white/10 text-brand-400 shadow-sm'
                      : 'text-dark-800/50 dark:text-white/50 hover:text-dark-800 dark:hover:text-white'
                  }`}
                >
                  <Icon size={15} weight={layout === mode ? 'fill' : 'regular'} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Vertical grid — shows every product, scrolls down infinitely */}
          <div className={gridClass}>
            {visibleGridProducts.map((p, i) => {
              const featured = isFeatured(i)
              const spanClass = featured ? 'col-span-2 row-span-2' : ''
              return (
                <div key={p.id} className={spanClass}>
                  <ProductCard product={p} index={i} compact={layout === 'compact'} />
                </div>
              )
            })}
          </div>

          {/* Skeleton rows while loading more */}
          {hasMoreGridProducts && (
            <div className={`${gridClass} mt-3`}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} compact={layout === 'compact'} />
              ))}
            </div>
          )}

          {/* Sentinel — triggers next page load when scrolled into view */}
          <InfiniteScrollSentinel onReach={handleReachEnd} disabled={!canLoadMore} />

          {/* End-of-results label */}
          {!hasMoreGridProducts && visibleProducts.length > 0 && (
            <p className="text-center text-xs text-dark-800/35 dark:text-white/30 mt-8 pb-2">
              All {visibleProducts.length} product{visibleProducts.length !== 1 ? 's' : ''} shown
            </p>
          )}
        </section>
      )}

      {/* Empty state */}
      {!isLoading && !productsIsError && (!visibleProducts || visibleProducts.length === 0) && (
        <div className="text-center py-24">
          <MagnifyingGlassMinus size={56} weight="duotone" className="text-brand-400 mx-auto mb-4" />
          <h3 className="text-dark-800 dark:text-white font-semibold mb-2">No products found</h3>
          <p className="text-dark-800/50 dark:text-white/40 text-sm">
            {activeFilterCount > 0 ? 'Try widening your filters' : 'Try a different search or category'}
          </p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters(defaultFilters)}
              className="mt-4 text-brand-400 text-sm font-semibold hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* Filter bottom sheet */}
      <AnimatePresence>
        {filterOpen && (
          <>
            <motion.div
              key="filter-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setFilterOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              key="filter-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 dark:bg-dark-900 rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col"
            >
              {/* Drag handle */}
              <div className="pt-3 pb-1 flex justify-center flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-cream-300 dark:bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0">
                <h2 className="font-display text-xl font-bold text-dark-800 dark:text-white">Filters</h2>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilters(defaultFilters)}
                    disabled={activeFilterCount === 0}
                    className="text-brand-400 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-400/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    aria-label="Close filters"
                    className="w-9 h-9 rounded-xl hover:bg-cream-100 dark:hover:bg-white/10 text-dark-800/60 dark:text-white/60 flex items-center justify-center"
                  >
                    <X size={18} weight="bold" />
                  </button>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-6">
                {/* Sort */}
                <section>
                  <h3 className="text-[10px] uppercase tracking-[0.25em] font-semibold text-dark-800/55 dark:text-white/45 mb-2.5">
                    Sort by
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {SORT_OPTIONS.map(opt => {
                      const active = filters.sort === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFilters(f => ({ ...f, sort: opt.value }))}
                          className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                            active
                              ? 'bg-brand-400 text-white shadow-amber-glow'
                              : 'glass text-dark-800/70 dark:text-white/60 hover:text-brand-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Price range */}
                <section>
                  <h3 className="text-[10px] uppercase tracking-[0.25em] font-semibold text-dark-800/55 dark:text-white/45 mb-2.5">
                    Price range (GHS)
                  </h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                      className="input text-sm flex-1"
                    />
                    <span className="text-dark-800/40 dark:text-white/30 text-sm">—</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                      className="input text-sm flex-1"
                    />
                  </div>
                </section>

                {/* Toggles */}
                <section className="space-y-2">
                  {([
                    { key: 'inStockOnly', label: 'In stock only', desc: 'Hide out-of-stock products' },
                    { key: 'freeDeliveryOnly', label: 'Free delivery only', desc: 'Show only products with no delivery charge' },
                    { key: 'preorderOnly', label: 'Preorders only', desc: 'Show only products marked as preorder' },
                    { key: 'excludePreorders', label: 'Exclude preorders', desc: 'Hide preorder items (in-stock only)' },
                  ] as const).map(opt => {
                    const checked = filters[opt.key]
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setFilters(f => {
                          const nextVal = !f[opt.key]
                          if (opt.key === 'preorderOnly' && nextVal) {
                            return { ...f, preorderOnly: true, excludePreorders: false }
                          }
                          if (opt.key === 'excludePreorders' && nextVal) {
                            return { ...f, excludePreorders: true, preorderOnly: false }
                          }
                          return { ...f, [opt.key]: nextVal }
                        })}
                        className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-2xl text-left transition-all ${
                          checked
                            ? 'bg-brand-400/10 border border-brand-400/30'
                            : 'glass border border-transparent hover:border-brand-400/20'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-dark-800 dark:text-white">{opt.label}</p>
                          <p className="text-[11px] text-dark-800/50 dark:text-white/40">{opt.desc}</p>
                        </div>
                        <span
                          className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors relative ${
                            checked ? 'bg-brand-400' : 'bg-cream-300 dark:bg-white/20'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              checked ? 'translate-x-[22px]' : 'translate-x-0.5'
                            }`}
                          />
                        </span>
                      </button>
                    )
                  })}
                </section>
              </div>

              {/* Apply CTA */}
              <div className="px-5 pt-3 pb-safe border-t border-cream-200 dark:border-white/10 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="w-full bg-brand-400 hover:bg-brand-500 text-white font-semibold py-3.5 rounded-2xl transition-colors shadow-amber-glow"
                >
                  Show {visibleProducts?.length ?? 0} result{visibleProducts?.length === 1 ? '' : 's'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  )
}
