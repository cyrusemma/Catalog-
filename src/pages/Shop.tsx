import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom'
import {
  MagnifyingGlass,
  Faders,
  MagnifyingGlassMinus,
  CaretRight,
  CaretDown,
  ArrowRight,
  X,
  SquaresFour,
  GridNine,
  Rows,
  Check,
  CheckCircle,
  Truck,
  Clock,
  SlidersHorizontal,
} from '@phosphor-icons/react'
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
import { usePriceRanges } from '../hooks/usePriceRanges'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useStoreContext } from '../contexts/StoreContext'
import { useCurrencyStore } from '../store/currencyStore'
import { effectivePrice, getCurrencySymbol } from '../lib/utils'
import SEOHead from '../components/layout/SEOHead'

import type { Product } from '../types'

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'featured'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'featured', label: 'Featured first' },
  { value: 'price-asc', label: 'Price: low → high' },
  { value: 'price-desc', label: 'Price: high → low' },
]

const PRODUCT_CHUNK_SIZE = 10
const PAGE_SIZE = 24

const defaultFilters = {
  sort: 'newest' as SortOption,
  selectedPriceRanges: [] as string[],
  minPrice: '',
  maxPrice: '',
  inStockOnly: false,
  freeDeliveryOnly: false,
  preorderOnly: false,
  excludePreorders: false,
}

function parseUrlFilters(searchStr: string) {
  const params = new URLSearchParams(searchStr)
  const sortParam = params.get('sort') as SortOption | null
  const validSorts: SortOption[] = ['newest', 'featured', 'price-asc', 'price-desc']
  const sort = sortParam && validSorts.includes(sortParam) ? sortParam : 'newest'
  const inStockOnly = params.get('in_stock') === '1' || params.get('in_stock') === 'true'
  const freeDeliveryOnly = params.get('free_delivery') === '1' || params.get('free_delivery') === 'true'
  const preorderOnly = params.get('preorder') === '1' || params.get('preorder') === 'true'
  const excludePreorders = params.get('no_preorder') === '1' || params.get('no_preorder') === 'true'
  const minPrice = params.get('min_price') || ''
  const maxPrice = params.get('max_price') || ''
  const selectedPriceRanges = params.get('ranges') ? params.get('ranges')!.split(',').filter(Boolean) : []

  return {
    sort,
    selectedPriceRanges,
    minPrice,
    maxPrice,
    inStockOnly,
    freeDeliveryOnly,
    preorderOnly,
    excludePreorders,
  }
}

export default function Shop() {
  useDocumentTitle('Shop')
  const navigate = useNavigate()
  const location = useLocation()
  const navType = useNavigationType()
  const params = useParams<{ parentSlug?: string; subSlug?: string }>()

  // Initialize search & filters directly from URL query parameters
  const initialUrlParams = useMemo(() => new URLSearchParams(location.search), [])
  const [search, setSearch] = useState(() => initialUrlParams.get('q') || '')
  const [query, setQuery] = useState(() => initialUrlParams.get('q') || '')
  const [filters, setFilters] = useState(() => parseUrlFilters(location.search))
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const [layout, setLayout] = useState<LayoutMode>('grid')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const pendingScrollRef = useRef<number | null>(null)
  const { data: categoryTree } = useCategoryTree()
  const { data: productCategoryRefs } = useProductCategoryRefs()

  // Currency information
  const settings = useStoreSettings()
  const storeName = settings.store_name || 'Catalog by Cyrus'
  const displayCurrency = useCurrencyStore(s => s.displayCurrency)
  const activeCurrencyCode = displayCurrency || settings.currency || 'GHS'
  const currencySymbol = getCurrencySymbol(activeCurrencyCode)

  // Pretty-URL routing: /shop, /shop/electronics, /shop/electronics/phones-tablets
  const parentSlug = params.parentSlug ?? null
  const subSlug = params.subSlug ?? null

  const parents = topLevelCategories(categoryTree)
  const activeParent = parents.find(p => p.slug === parentSlug)
  const subs = activeParent ? childCategories(categoryTree, activeParent.id) : []
  const activeSub = subs.find(s => s.slug === subSlug)

  // Category IDs for query
  const categoryIds = useMemo(() => {
    if (activeSub) return [activeSub.id]
    if (activeParent) return expandCategoryIds(categoryTree, activeParent.id)
    return undefined
  }, [activeParent, activeSub, categoryTree])

  // Active Category Names for fallback matching against legacy string categories
  const activeCategoryNames = useMemo(() => {
    const names = new Set<string>()
    if (activeSub) {
      names.add(activeSub.name.toLowerCase().trim())
    } else if (activeParent) {
      names.add(activeParent.name.toLowerCase().trim())
      const children = childCategories(categoryTree, activeParent.id)
      for (const ch of children) {
        names.add(ch.name.toLowerCase().trim())
      }
    }
    return names
  }, [activeParent, activeSub, categoryTree])

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

  const [filterOpen, setFilterOpen] = useState(false)
  const { data: priceRanges = [] } = usePriceRanges({ onlyActive: true })

  // Debounce typed search into query state (180ms) to keep input at 60fps
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim())
    }, 180)
    return () => clearTimeout(timer)
  }, [search])

  // Sync state to URL search parameters without polluting history stack
  useEffect(() => {
    const p = new URLSearchParams()
    if (query) p.set('q', query)
    if (filters.sort !== 'newest') p.set('sort', filters.sort)
    if (filters.inStockOnly) p.set('in_stock', '1')
    if (filters.freeDeliveryOnly) p.set('free_delivery', '1')
    if (filters.preorderOnly) p.set('preorder', '1')
    if (filters.excludePreorders) p.set('no_preorder', '1')
    if (filters.minPrice) p.set('min_price', filters.minPrice)
    if (filters.maxPrice) p.set('max_price', filters.maxPrice)
    if (filters.selectedPriceRanges.length > 0) p.set('ranges', filters.selectedPriceRanges.join(','))

    const newSearch = p.toString()
    const currentSearch = location.search.replace(/^\?/, '')
    if (newSearch !== currentSearch) {
      navigate(
        { pathname: location.pathname, search: newSearch ? `?${newSearch}` : '' },
        { replace: true }
      )
    }
  }, [query, filters, location.pathname, location.search, navigate])

  // Handle external URL changes (e.g. browser Back / Forward buttons)
  useEffect(() => {
    const p = new URLSearchParams(location.search)
    const qVal = p.get('q') || ''
    if (qVal !== search) {
      setSearch(qVal)
      setQuery(qVal)
    }
    const nextFilters = parseUrlFilters(location.search)
    setFilters(prev => {
      if (
        prev.sort === nextFilters.sort &&
        prev.inStockOnly === nextFilters.inStockOnly &&
        prev.freeDeliveryOnly === nextFilters.freeDeliveryOnly &&
        prev.preorderOnly === nextFilters.preorderOnly &&
        prev.excludePreorders === nextFilters.excludePreorders &&
        prev.minPrice === nextFilters.minPrice &&
        prev.maxPrice === nextFilters.maxPrice &&
        prev.selectedPriceRanges.join(',') === nextFilters.selectedPriceRanges.join(',')
      ) {
        return prev
      }
      return nextFilters
    })
  }, [location.search])

  // Close search suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeFilterCount =
    (filters.sort !== 'newest' ? 1 : 0) +
    filters.selectedPriceRanges.length +
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

  // Trie-based search and ranking engine with autocomplete
  const {
    searchResults,
    suggestions,
  } = useCatalogSearch(allProducts, {
    initialQuery: query,
    categoryIds,
    storeId: storeId ?? undefined,
    debounceMs: 120,
    enableFuzzy: true,
  })

  // Filter & sort visible products
  const visibleProducts = useMemo(() => {
    if (!allProducts) return undefined
    let result = (query || (categoryIds && categoryIds.length > 0)) ? searchResults : allProducts

    // Support legacy category string matching alongside UUID category_id
    if (!query && categoryIds && categoryIds.length > 0) {
      const catSet = new Set(categoryIds)
      result = result.filter(p => {
        if (p.category_id && catSet.has(p.category_id)) return true
        if (p.category && activeCategoryNames.has(p.category.toLowerCase().trim())) return true
        return false
      })
    }

    // Filter by configured price ranges
    if (filters.selectedPriceRanges.length > 0 && priceRanges.length > 0) {
      const activeSelectedRanges = priceRanges.filter(r => filters.selectedPriceRanges.includes(r.id))
      if (activeSelectedRanges.length > 0) {
        result = result.filter(p => {
          const price = effectivePrice(p)
          return activeSelectedRanges.some(r => {
            const matchesMin = price >= r.min_price
            const matchesMax = r.max_price === null || price <= r.max_price
            return matchesMin && matchesMax
          })
        })
      }
    }

    // Filter by manual min/max prices
    const min = filters.minPrice ? parseFloat(filters.minPrice) : null
    const max = filters.maxPrice ? parseFloat(filters.maxPrice) : null
    if (min !== null && !Number.isNaN(min)) result = result.filter(p => effectivePrice(p) >= min)
    if (max !== null && !Number.isNaN(max)) result = result.filter(p => effectivePrice(p) <= max)

    if (filters.inStockOnly) result = result.filter(p => p.stock_status !== 'out_of_stock')
    if (filters.freeDeliveryOnly) result = result.filter(p => Number(p.delivery_fee) === 0)
    if (filters.preorderOnly) result = result.filter(p => p.is_preorder)
    if (filters.excludePreorders) result = result.filter(p => !p.is_preorder)

    switch (filters.sort) {
      case 'price-asc':
        result = [...result].sort((a, b) => effectivePrice(a) - effectivePrice(b))
        break
      case 'price-desc':
        result = [...result].sort((a, b) => effectivePrice(b) - effectivePrice(a))
        break
      case 'featured':
        result = [...result].sort((a, b) => Number(b.is_featured) - Number(a.is_featured))
        break
      case 'newest':
        if (!query) {
          result = [...result].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        }
        break
    }
    return result
  }, [allProducts, searchResults, query, categoryIds, activeCategoryNames, filters, priceRanges])

  // Group products by category for the "All" view
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

  // Progressive Chunking: display in batches of 24 to keep the DOM light and fast
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query, parentSlug, subSlug, filters])

  const visibleGridProducts = useMemo(() => {
    if (!visibleProducts) return []
    return visibleProducts.slice(0, visibleCount)
  }, [visibleProducts, visibleCount])

  const hasMoreGridProducts = (visibleProducts?.length ?? 0) > visibleGridProducts.length

  const handleReachEnd = useCallback(() => {
    if (hasMoreGridProducts) {
      setVisibleCount(prev => prev + PAGE_SIZE)
    }
  }, [hasMoreGridProducts])

  // Scroll restoration on Back/Forward navigation
  useEffect(() => {
    if (navType === 'POP') {
      const saved = sessionStorage.getItem(`shop-scroll:${location.pathname}`)
      if (saved) {
        try {
          const { scrollY } = JSON.parse(saved) as { scrollY?: number }
          if (typeof scrollY === 'number') pendingScrollRef.current = scrollY
        } catch {
          // ignore
        }
      }
    }
  }, [parentSlug, subSlug, query, navType, location.pathname])

  useEffect(() => {
    if (pendingScrollRef.current === null) return
    if (!visibleProducts) return
    const y = pendingScrollRef.current
    pendingScrollRef.current = null
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)))
  }, [visibleProducts])

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(search.trim())
    setShowSuggestions(false)
  }

  const handleClearSearch = () => {
    setSearch('')
    setQuery('')
    setShowSuggestions(false)
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

  const gridClass = {
    grid:     'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4',
    magazine: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4',
    compact:  'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2',
  }[layout]

  const isFeatured = (index: number) => layout === 'magazine' && index % 5 === 0

  const shopCollectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Shop All Products | ${storeName}`,
    description: 'Browse our complete catalog of curated products, clothing, shoes, accessories, and electronics.',
    url: typeof window !== 'undefined' ? `${window.location.origin}/shop` : 'https://ccatalog.store/shop',
  }

  return (
    <main className="w-full flex-1 max-w-7xl mx-auto px-4 py-4 sm:py-8 pb-28 lg:pb-12">
      <SEOHead
        title={activeParent ? `${activeParent.name} | ${storeName}` : `Shop All Products | ${storeName}`}
        description={activeParent?.description || `Explore our selection of products on ${storeName}. Easy WhatsApp ordering and fast delivery.`}
        schemaData={shopCollectionSchema}
      />

      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-4xl font-display font-semibold tracking-[-0.02em] text-dark-800 dark:text-white">
              {activeSub?.name || activeParent?.name || 'Shop'}
            </h1>
            <p className="text-dark-800/50 dark:text-white/40 text-xs sm:text-sm mt-1">
              {visibleProducts ? `Browse ${visibleProducts.length} product${visibleProducts.length !== 1 ? 's' : ''}` : 'Loading products...'}
              {activeFilterCount > 0 && visibleProducts && allProducts && visibleProducts.length !== allProducts.length && (
                <span className="text-brand-500 font-medium ml-1">
                  ({allProducts.length - visibleProducts.length} filtered out)
                </span>
              )}
            </p>
          </div>

          {/* Quick Layout & Sort Controls for Desktop */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={filters.sort}
                aria-label="Sort products by"
                onChange={e => setFilters(f => ({ ...f, sort: e.target.value as SortOption }))}
                className="glass text-xs font-semibold py-2 pl-3.5 pr-8 rounded-xl text-dark-800/80 dark:text-white/80 appearance-none cursor-pointer border border-cream-200/80 dark:border-white/10 hover:border-brand-400/40 transition-colors"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-dark-800 text-dark-800 dark:text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <CaretDown size={12} weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-800/40 dark:text-white/40 pointer-events-none" />
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
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    layout === mode
                      ? 'bg-white dark:bg-white/10 text-brand-500 shadow-sm font-semibold'
                      : 'text-dark-800/50 dark:text-white/50 hover:text-dark-800 dark:hover:text-white'
                  }`}
                >
                  <Icon size={14} weight={layout === mode ? 'fill' : 'regular'} />
                  <span className="hidden md:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb Path */}
      {breadcrumbItems.length > 1 && (
        <nav aria-label="Category path" className="mb-3 -mt-2 flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1
            return (
              <div key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <CaretRight size={11} weight="bold" className="text-dark-800/30 dark:text-white/25" />}
                <button
                  type="button"
                  onClick={item.onClick}
                  disabled={isLast}
                  className={`font-medium transition-colors ${
                    isLast
                      ? 'text-brand-500 cursor-default font-semibold'
                      : 'text-dark-800/50 dark:text-white/45 hover:text-brand-500'
                  }`}
                >
                  {item.label}
                </button>
              </div>
            )
          })}
        </nav>
      )}

      {/* Sticky Bar (Search + Categories + Quick Filter Pills) */}
      <div className="sticky top-16 z-30 -mx-4 px-4 pt-2.5 pb-2.5 mb-4 bg-cream-50/95 dark:bg-dark-900/90 backdrop-blur-xl border-b border-cream-200/50 dark:border-white/5 lg:static lg:bg-transparent lg:dark:bg-transparent lg:backdrop-blur-none lg:p-0 lg:mx-0 lg:border-none">
        
        {/* Search Input & Filter Button */}
        <div ref={searchContainerRef} className="relative flex gap-2 sm:gap-3 mb-2.5">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-400 dark:text-white/30" />
            <input
              type="text"
              placeholder="Search catalog, brands, features..."
              value={search}
              onFocus={() => setShowSuggestions(true)}
              onChange={e => {
                setSearch(e.target.value)
                setShowSuggestions(true)
              }}
              className="input pl-10 pr-9 py-2 sm:py-2.5 text-sm w-full rounded-2xl shadow-sm"
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

          {/* Autocomplete Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && search.trim().length >= 2 && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.99 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-14 sm:right-16 mt-1.5 z-40 bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden py-2"
              >
                <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-dark-800/40 dark:text-white/40">
                  Suggestions
                </div>
                {suggestions.slice(0, 5).map(sug => (
                  <button
                    key={`${sug.type}-${sug.id}`}
                    type="button"
                    onClick={() => {
                      if (sug.product) {
                        navigate(`/product/${sug.product.id}`)
                      } else {
                        setSearch(sug.title)
                        setQuery(sug.title)
                        setShowSuggestions(false)
                      }
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-cream-100 dark:hover:bg-white/5 transition-colors text-xs text-dark-800 dark:text-white"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MagnifyingGlass size={13} className="text-brand-500 shrink-0" />
                      <span className="truncate font-medium">{sug.title}</span>
                      {sug.subtitle && (
                        <span className="text-[10px] text-dark-800/40 dark:text-white/40 truncate">
                          in {sug.subtitle}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] uppercase font-semibold text-brand-500/80 px-1.5 py-0.5 rounded bg-brand-400/10 shrink-0">
                      {sug.type}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter Bottom Sheet Trigger */}
          <button
            type="button"
            aria-label={`Open Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
            onClick={() => setFilterOpen(true)}
            className="relative glass px-3.5 rounded-2xl flex items-center gap-1.5 text-dark-800/70 dark:text-white/70 hover:text-brand-500 transition-colors shadow-sm"
          >
            <Faders size={16} weight="bold" />
            <span className="hidden sm:inline text-xs font-semibold">Filters</span>
            {activeFilterCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-amber-glow">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Top-Level Category Pills */}
        <div className="relative -mx-4 lg:mx-0">
          <div
            aria-hidden="true"
            className="lg:hidden pointer-events-none absolute left-0 top-0 bottom-1 w-5 z-10 bg-gradient-to-r from-cream-50/95 dark:from-dark-900/95 to-transparent"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide px-4 lg:px-0 scroll-smooth snap-x snap-mandatory overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <button
              type="button"
              onClick={() => handleParentChange(null)}
              className={`flex-shrink-0 snap-start px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                !activeParent
                  ? 'bg-gradient-to-r from-brand-400 to-brand-500 text-white shadow-amber-glow font-semibold'
                  : 'glass text-dark-800/70 dark:text-white/60 hover:text-brand-500'
              }`}
            >
              All
            </button>
            {visibleParents.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleParentChange(cat.slug)}
                className={`flex-shrink-0 snap-start px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeParent?.id === cat.id
                    ? 'bg-gradient-to-r from-brand-400 to-brand-500 text-white shadow-amber-glow font-semibold'
                    : 'glass text-dark-800/70 dark:text-white/60 hover:text-brand-500'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="lg:hidden pointer-events-none absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-l from-cream-50/95 dark:from-dark-900/95 to-transparent"
          />
        </div>

        {/* Sub-Category Pills */}
        {activeParent && visibleSubs.length > 0 && (
          <div className="relative -mx-4 lg:mx-0 mt-1.5">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide px-4 lg:px-0 scroll-smooth snap-x snap-proximity overscroll-x-contain [-webkit-overflow-scrolling:touch]">
              <button
                type="button"
                onClick={() => handleSubChange(null)}
                className={`flex-shrink-0 snap-start px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                  !activeSub
                    ? 'bg-brand-400/20 text-brand-600 dark:text-brand-300 border border-brand-400/40 font-semibold'
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
                  className={`flex-shrink-0 snap-start px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                    activeSub?.id === s.id
                      ? 'bg-brand-400/20 text-brand-600 dark:text-brand-300 border border-brand-400/40 font-semibold'
                      : 'bg-transparent text-dark-800/55 dark:text-white/50 border border-cream-200 dark:border-white/10 hover:border-brand-400/30'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1-Tap Quick Filters Bar (In Stock, Free Delivery, Preorder) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-hide pt-2 mt-1 border-t border-cream-200/40 dark:border-white/5">
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            {/* In Stock Quick Pill */}
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, inStockOnly: !f.inStockOnly }))}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                filters.inStockOnly
                  ? 'bg-brand-500 text-white shadow-amber-glow'
                  : 'glass text-dark-800/70 dark:text-white/60 hover:text-brand-500 border border-cream-200/80 dark:border-white/10'
              }`}
            >
              <CheckCircle size={12} weight={filters.inStockOnly ? 'fill' : 'regular'} />
              <span>In Stock</span>
            </button>

            {/* Free Delivery Quick Pill */}
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, freeDeliveryOnly: !f.freeDeliveryOnly }))}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                filters.freeDeliveryOnly
                  ? 'bg-brand-500 text-white shadow-amber-glow'
                  : 'glass text-dark-800/70 dark:text-white/60 hover:text-brand-500 border border-cream-200/80 dark:border-white/10'
              }`}
            >
              <Truck size={12} weight={filters.freeDeliveryOnly ? 'fill' : 'regular'} />
              <span>Free Delivery</span>
            </button>

            {/* Preorder Quick Pill */}
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, preorderOnly: !f.preorderOnly, excludePreorders: false }))}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                filters.preorderOnly
                  ? 'bg-brand-500 text-white shadow-amber-glow'
                  : 'glass text-dark-800/70 dark:text-white/60 hover:text-brand-500 border border-cream-200/80 dark:border-white/10'
              }`}
            >
              <Clock size={12} weight={filters.preorderOnly ? 'fill' : 'regular'} />
              <span>Pre-orders</span>
            </button>
          </div>

          {/* Mobile Sort Dropdown */}
          <div className="flex sm:hidden items-center shrink-0 ml-auto">
            <div className="relative">
              <select
                value={filters.sort}
                aria-label="Sort products by"
                onChange={e => setFilters(f => ({ ...f, sort: e.target.value as SortOption }))}
                className="glass appearance-none text-[11px] font-semibold py-1 pl-2.5 pr-6 rounded-xl text-dark-800/80 dark:text-white/80 border border-cream-200/80 dark:border-white/10 cursor-pointer"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-dark-800 text-dark-800 dark:text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <CaretDown size={10} weight="bold" className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-800/40 dark:text-white/40 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Chips with 1-Tap Dismiss */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="text-[11px] font-semibold text-dark-800/45 dark:text-white/40 mr-1 flex items-center gap-1">
            <SlidersHorizontal size={12} /> Active:
          </span>

          {filters.sort !== 'newest' && (
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, sort: 'newest' }))}
              className="inline-flex items-center gap-1 text-[11px] font-medium bg-brand-400/10 text-brand-600 dark:text-brand-300 border border-brand-400/20 px-2 py-0.5 rounded-lg hover:bg-brand-400/20 transition-colors"
            >
              <span>Sort: {SORT_OPTIONS.find(o => o.value === filters.sort)?.label}</span>
              <X size={11} weight="bold" />
            </button>
          )}

          {filters.inStockOnly && (
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, inStockOnly: false }))}
              className="inline-flex items-center gap-1 text-[11px] font-medium bg-brand-400/10 text-brand-600 dark:text-brand-300 border border-brand-400/20 px-2 py-0.5 rounded-lg hover:bg-brand-400/20 transition-colors"
            >
              <span>In stock</span>
              <X size={11} weight="bold" />
            </button>
          )}

          {filters.freeDeliveryOnly && (
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, freeDeliveryOnly: false }))}
              className="inline-flex items-center gap-1 text-[11px] font-medium bg-brand-400/10 text-brand-600 dark:text-brand-300 border border-brand-400/20 px-2 py-0.5 rounded-lg hover:bg-brand-400/20 transition-colors"
            >
              <span>Free delivery</span>
              <X size={11} weight="bold" />
            </button>
          )}

          {filters.preorderOnly && (
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, preorderOnly: false }))}
              className="inline-flex items-center gap-1 text-[11px] font-medium bg-brand-400/10 text-brand-600 dark:text-brand-300 border border-brand-400/20 px-2 py-0.5 rounded-lg hover:bg-brand-400/20 transition-colors"
            >
              <span>Pre-orders only</span>
              <X size={11} weight="bold" />
            </button>
          )}

          {filters.excludePreorders && (
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, excludePreorders: false }))}
              className="inline-flex items-center gap-1 text-[11px] font-medium bg-brand-400/10 text-brand-600 dark:text-brand-300 border border-brand-400/20 px-2 py-0.5 rounded-lg hover:bg-brand-400/20 transition-colors"
            >
              <span>No preorders</span>
              <X size={11} weight="bold" />
            </button>
          )}

          {filters.selectedPriceRanges.map(rangeId => {
            const range = priceRanges.find(r => r.id === rangeId)
            if (!range) return null
            return (
              <button
                key={rangeId}
                type="button"
                onClick={() => setFilters(f => ({
                  ...f,
                  selectedPriceRanges: f.selectedPriceRanges.filter(id => id !== rangeId),
                }))}
                className="inline-flex items-center gap-1 text-[11px] font-medium bg-brand-400/10 text-brand-600 dark:text-brand-300 border border-brand-400/20 px-2 py-0.5 rounded-lg hover:bg-brand-400/20 transition-colors"
              >
                <span>{range.label}</span>
                <X size={11} weight="bold" />
              </button>
            )
          })}

          {(filters.minPrice || filters.maxPrice) && (
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, minPrice: '', maxPrice: '' }))}
              className="inline-flex items-center gap-1 text-[11px] font-medium bg-brand-400/10 text-brand-600 dark:text-brand-300 border border-brand-400/20 px-2 py-0.5 rounded-lg hover:bg-brand-400/20 transition-colors"
            >
              <span>
                {currencySymbol} {filters.minPrice || '0'} – {filters.maxPrice || '∞'}
              </span>
              <X size={11} weight="bold" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setFilters(defaultFilters)}
            className="text-[11px] font-bold text-brand-500 hover:underline ml-1"
          >
            Reset all
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pb-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} compact={layout === 'compact'} />
          ))}
        </div>
      )}

      {/* Error state */}
      {productsIsError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
          <p className="font-semibold">Products could not load.</p>
          <p className="mt-1 text-red-700/80 dark:text-red-200/80">
            {productsError instanceof Error ? productsError.message : 'Please check your connection and try again.'}
          </p>
        </div>
      )}

      {/* Netflix-style Category Rows (Shown only on root /shop without search or filters) */}
      {!isLoading && !productsIsError && showRowsView && (
        <div className="space-y-8 sm:space-y-12">
          {[...productsByCategory.entries()].map(([catId, { name, products: prods }]) => {
            const parent = categoryTree?.find(c => c.id === catId)
            const targetSlug = parent?.slug || (catId !== 'other' ? catId : null)

            return (
              <section key={catId} className="relative">
                <div className="flex items-end justify-between mb-3 sm:mb-4">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-display font-semibold tracking-[-0.02em] text-dark-800 dark:text-white">
                      {name}
                    </h2>
                    <span className="text-xs text-dark-800/40 dark:text-white/40">
                      {prods.length} item{prods.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {targetSlug && prods.length > PRODUCT_CHUNK_SIZE && (
                    <button
                      type="button"
                      onClick={() => handleParentChange(targetSlug)}
                      className="text-brand-500 text-xs sm:text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all flex-shrink-0"
                    >
                      See all {prods.length} <ArrowRight size={12} weight="bold" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {prods.slice(0, PRODUCT_CHUNK_SIZE).map((p, i) => (
                    <ProductCard key={p.id} product={p} index={i} compact={layout === 'compact'} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Main Filtered Product Grid with Infinite Scroll */}
      {!isLoading && !productsIsError && !showRowsView && visibleProducts && visibleProducts.length > 0 && (
        <section>
          {/* Grid of Products */}
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

          {/* Loading Skeletons when more items are streaming in */}
          {hasMoreGridProducts && (
            <div className={`${gridClass} mt-3 sm:mt-4`}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={`more-${i}`} compact={layout === 'compact'} />
              ))}
            </div>
          )}

          {/* Sentinel Intersection Observer */}
          <InfiniteScrollSentinel onReach={handleReachEnd} disabled={!hasMoreGridProducts} />

          {/* End-of-Catalog Indicator */}
          {!hasMoreGridProducts && visibleProducts.length > 0 && (
            <p className="text-center text-xs text-dark-800/40 dark:text-white/35 mt-8 pb-2">
              All {visibleProducts.length} product{visibleProducts.length !== 1 ? 's' : ''} loaded
            </p>
          )}
        </section>
      )}

      {/* Empty State */}
      {!isLoading && !productsIsError && (!visibleProducts || visibleProducts.length === 0) && (
        <div className="text-center py-16 sm:py-24 px-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-brand-400/10 dark:bg-brand-400/15 flex items-center justify-center mx-auto mb-4 text-brand-500">
            <MagnifyingGlassMinus size={32} weight="duotone" />
          </div>
          <h3 className="text-lg font-bold text-dark-800 dark:text-white mb-2">No matching products found</h3>
          <p className="text-dark-800/60 dark:text-white/50 text-sm mb-6 leading-relaxed">
            {activeFilterCount > 0
              ? "We couldn't find matches for the active filters. Clear or adjust them to explore all available items."
              : query
              ? `No items match "${query}". Try checking for typos or searching by broader keywords.`
              : "There are no products listed in this section right now."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => setFilters(defaultFilters)}
                className="btn-primary py-2.5 px-5 text-xs font-bold"
              >
                Reset filters
              </button>
            )}
            {query && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="btn-ghost py-2.5 px-5 text-xs font-semibold"
              >
                Clear search
              </button>
            )}
            {!query && activeFilterCount === 0 && (
              <button
                type="button"
                onClick={() => handleParentChange(null)}
                className="btn-primary py-2.5 px-5 text-xs font-bold"
              >
                Browse all products
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Bottom Sheet (Mobile) & Side Drawer (Desktop) */}
      <AnimatePresence>
        {filterOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="filter-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setFilterOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Sheet / Drawer Container */}
            <motion.div
              key="filter-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed z-50 bg-cream-50 dark:bg-dark-900 shadow-2xl flex flex-col
                bottom-0 left-0 right-0 rounded-t-3xl max-h-[88vh]
                sm:top-0 sm:bottom-0 sm:right-0 sm:left-auto sm:w-[420px] sm:max-h-full sm:rounded-l-3xl sm:rounded-r-none"
            >
              {/* Drag Handle (Mobile only) */}
              <div className="pt-3 pb-1 flex justify-center flex-shrink-0 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-cream-300 dark:bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-3 sm:pt-6 pb-3 flex-shrink-0 border-b border-cream-200/60 dark:border-white/10">
                <div>
                  <h2 className="font-display text-xl font-bold text-dark-800 dark:text-white">Filters & Sort</h2>
                  <p className="text-xs text-dark-800/40 dark:text-white/40 mt-0.5">
                    {visibleProducts?.length ?? 0} product{visibleProducts?.length !== 1 ? 's' : ''} available
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilters(defaultFilters)}
                    disabled={activeFilterCount === 0}
                    className="text-brand-500 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-brand-400/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  >
                    Reset all
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    aria-label="Close filters"
                    className="w-8 h-8 rounded-xl hover:bg-cream-100 dark:hover:bg-white/10 text-dark-800/60 dark:text-white/60 flex items-center justify-center"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                {/* Sort Option */}
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
                          className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between ${
                            active
                              ? 'bg-brand-500 text-white shadow-amber-glow font-semibold'
                              : 'glass text-dark-800/70 dark:text-white/60 hover:text-brand-500 border border-cream-200/80 dark:border-white/10'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {active && <Check size={12} weight="bold" />}
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Configured Price Ranges */}
                {priceRanges && priceRanges.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-[10px] uppercase tracking-[0.25em] font-semibold text-dark-800/55 dark:text-white/45">
                        Price Bracket
                      </h3>
                      {filters.selectedPriceRanges.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilters(f => ({ ...f, selectedPriceRanges: [] }))}
                          className="text-[10px] font-semibold text-brand-500 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {priceRanges.map(range => {
                        const selected = filters.selectedPriceRanges.includes(range.id)
                        return (
                          <button
                            key={range.id}
                            type="button"
                            onClick={() => setFilters(f => {
                              const already = f.selectedPriceRanges.includes(range.id)
                              return {
                                ...f,
                                selectedPriceRanges: already
                                  ? f.selectedPriceRanges.filter(id => id !== range.id)
                                  : [...f.selectedPriceRanges, range.id]
                              }
                            })}
                            className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between gap-1.5 ${
                              selected
                                ? 'bg-brand-500 text-white shadow-amber-glow font-semibold'
                                : 'glass text-dark-800/70 dark:text-white/60 hover:text-brand-500 border border-cream-200/80 dark:border-white/10'
                            }`}
                          >
                            <span className="truncate">{range.label}</span>
                            {selected && <Check size={13} weight="bold" className="flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )}

                {/* Custom Price Range */}
                <section>
                  <h3 className="text-[10px] uppercase tracking-[0.25em] font-semibold text-dark-800/55 dark:text-white/45 mb-2.5">
                    Custom Price Range ({currencySymbol})
                  </h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                      className="input text-sm flex-1 rounded-xl"
                    />
                    <span className="text-dark-800/40 dark:text-white/30 text-sm font-semibold">—</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                      className="input text-sm flex-1 rounded-xl"
                    />
                  </div>
                </section>

                {/* Product Status Toggles */}
                <section className="space-y-2">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] font-semibold text-dark-800/55 dark:text-white/45 mb-2.5">
                    Availability & Shipping
                  </h3>
                  {([
                    { key: 'inStockOnly', label: 'In stock only', desc: 'Hide out-of-stock products' },
                    { key: 'freeDeliveryOnly', label: 'Free delivery only', desc: 'Show only items with free delivery' },
                    { key: 'preorderOnly', label: 'Preorders only', desc: 'Show items available for preorder' },
                    { key: 'excludePreorders', label: 'Exclude preorders', desc: 'Show ready-to-ship items only' },
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
                            ? 'bg-brand-400/10 border border-brand-400/40'
                            : 'glass border border-cream-200/80 dark:border-white/10 hover:border-brand-400/30'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-dark-800 dark:text-white">{opt.label}</p>
                          <p className="text-[11px] text-dark-800/50 dark:text-white/40">{opt.desc}</p>
                        </div>
                        <span
                          className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors relative ${
                            checked ? 'bg-brand-500' : 'bg-cream-300 dark:bg-white/20'
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
              <div className="px-5 py-4 border-t border-cream-200 dark:border-white/10 flex-shrink-0 bg-cream-50/80 dark:bg-dark-900/80 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3.5 rounded-2xl transition-colors shadow-amber-glow"
                >
                  Show {visibleProducts?.length ?? 0} product{visibleProducts?.length === 1 ? '' : 's'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  )
}
