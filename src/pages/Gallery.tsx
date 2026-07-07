import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass, X, SquaresFour, GridNine, Rows, ShoppingCart } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProducts } from '../hooks/useProducts'
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter'
import { useCartStore } from '../store/cartStore'
import { effectivePrice } from '../lib/utils'
import SkeletonCard from '../components/ui/SkeletonCard'

const PRODUCT_CHUNK_SIZE = 20

type LayoutMode = 'grid' | 'magazine' | 'compact'

const layoutButtons: { mode: LayoutMode; Icon: typeof SquaresFour; label: string }[] = [
  { mode: 'grid',     Icon: SquaresFour, label: 'Grid' },
  { mode: 'magazine', Icon: Rows,        label: 'Magazine' },
  { mode: 'compact',  Icon: GridNine,    label: 'Compact' },
]

export default function Gallery() {
  const formatPrice = useCurrencyFormatter()
  const navigate = useNavigate()
  const addItem = useCartStore(s => s.addItem)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(PRODUCT_CHUNK_SIZE)
  const [layout, setLayout] = useState<LayoutMode>('grid')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const observerTarget = useRef<HTMLDivElement>(null)

  const { data: products, isLoading, isError, error } = useProducts({
    search: query || undefined,
  })

  // Compute categories list from products
  const categories = useMemo(() => {
    if (!products) return ['All']
    const unique = Array.from(new Set(products.map(p => p.category).filter(Boolean)))
    return ['All', ...unique]
  }, [products])

  // Filter products by selectedCategory client-side
  const filteredProducts = useMemo(() => {
    if (!products) return []
    if (selectedCategory === 'All') return products
    return products.filter(p => p.category === selectedCategory)
  }, [products, selectedCategory])

  const visibleProducts = filteredProducts.slice(0, visibleCount)
  const hasMoreProducts = Boolean(filteredProducts.length > visibleCount)

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMoreProducts) {
          setVisibleCount(prev => prev + PRODUCT_CHUNK_SIZE)
        }
      },
      { threshold: 0.1 }
    )
    if (observerTarget.current) observer.observe(observerTarget.current)
    return () => observer.disconnect()
  }, [hasMoreProducts])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(search)
    setSelectedCategory('All') // Reset category on active search query
    setVisibleCount(PRODUCT_CHUNK_SIZE)
  }

  const handleClearSearch = () => {
    setSearch('')
    setQuery('')
    setVisibleCount(PRODUCT_CHUNK_SIZE)
  }

  // MAGAZINE: every 5th item is featured
  const isFeatured = (index: number) => layout === 'magazine' && index % 5 === 0

  const gridClass = {
    grid:     'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4',
    magazine: 'grid grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4',
    compact:  'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2',
  }[layout]

  return (
    <main className="w-full flex-1 max-w-7xl mx-auto px-4 py-5 sm:py-10 pb-28 lg:pb-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl sm:text-5xl font-display font-semibold tracking-[-0.02em] text-dark-800 dark:text-white">
            Gallery
          </h1>

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

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative max-w-md">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 pr-10 rounded-xl border border-cream-300 dark:border-white/10 bg-white dark:bg-white/5 text-dark-800 dark:text-white placeholder:text-dark-800/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-transparent transition-all"
            />
            <MagnifyingGlass size={18} className="absolute left-3 text-dark-800/50 dark:text-white/50 pointer-events-none" />
            {search && (
              <button
                type="button"
                title="Clear search"
                aria-label="Clear search"
                onClick={handleClearSearch}
                className="absolute right-3 text-dark-800/50 dark:text-white/50 hover:text-dark-800 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </form>

        {/* Category Filters Chips */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mt-6 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 select-none">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat)
                  setVisibleCount(PRODUCT_CHUNK_SIZE)
                }}
                className={`relative flex-shrink-0 px-4 py-1.5 text-xs font-semibold rounded-full border transition-all duration-300 ${
                  selectedCategory === cat
                    ? 'bg-brand-400 border-brand-400 text-white shadow-md shadow-brand-400/25'
                    : 'bg-white dark:bg-white/5 border-cream-200 dark:border-white/10 text-dark-800/60 dark:text-white/60 hover:text-dark-800 dark:hover:text-white hover:bg-cream-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error State */}
      {isError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4">
          <p className="text-red-700 dark:text-red-300 text-sm">
            {error instanceof Error ? error.message : 'Failed to load products'}
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className={gridClass}>
          {[...Array(12)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredProducts.length === 0 && (
        <div className="text-center py-20">
          <p className="text-dark-800/60 dark:text-white/60 text-lg">
            {query ? 'No products found matching your search' : 'No products available in this category'}
          </p>
        </div>
      )}

      {/* Image Grid */}
      {filteredProducts.length > 0 && (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={layout + '-' + selectedCategory}
              className={gridClass}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              {visibleProducts.map((product, index) => {
                const featured = isFeatured(index)
                const aspectClass = featured
                  ? 'col-span-2 row-span-2 aspect-square'
                  : 'aspect-square'

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
                    onClick={() => navigate(`/product/${product.id}`)}
                    className={`group cursor-pointer relative overflow-hidden rounded-xl ${aspectClass}`}
                  >
                    <div className="relative overflow-hidden rounded-xl bg-cream-100 dark:bg-white/5 w-full h-full">
                      {(product.images?.[0] ?? '') ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cream-200 to-cream-300 dark:from-white/10 dark:to-white/5">
                          <span className="text-dark-800/20 dark:text-white/20 text-center px-2 text-xs font-medium line-clamp-2">
                            {product.title}
                          </span>
                        </div>
                      )}

                      {/* Featured badge (magazine only) */}
                      {featured && (
                        <div className="absolute top-2 left-2 z-10">
                          <span className="bg-brand-400/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-amber-glow">
                            ✦ Featured
                          </span>
                        </div>
                      )}

                      {/* Frosted Glass Slide-up Details Drawer */}
                      <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out flex items-center justify-between p-2.5 sm:p-3.5 bg-gradient-to-t from-dark-950/95 via-dark-950/85 to-dark-950/40 backdrop-blur-md border-t border-white/10 z-10">
                        <div className="min-w-0 pr-1.5 text-left">
                          <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-brand-400 truncate">
                            {product.category || 'Collection'}
                          </span>
                          <h3 className="text-white font-semibold text-xs leading-tight truncate mt-0.5">
                            {product.title}
                          </h3>
                          <p className="text-white/90 font-bold text-xs mt-1">
                            {formatPrice(effectivePrice(product))}
                          </p>
                        </div>

                        {product.stock_status !== 'out_of_stock' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              addItem(product)
                            }}
                            aria-label="Add to cart"
                            className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 bg-brand-400 hover:bg-brand-500 text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-md shadow-brand-500/20 active:scale-90 hover:scale-105"
                          >
                            <ShoppingCart size={14} weight="bold" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>

          {/* Infinite Scroll Trigger */}
          <div ref={observerTarget} className="h-10 mt-8" />

          {/* Loading More Indicator */}
          {hasMoreProducts && (
            <div className="flex justify-center mt-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse [animation-duration:1.5s] [animation-timing-function:ease-in-out] [animation-delay:0.3s]" />
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse [animation-duration:1.5s] [animation-timing-function:ease-in-out] [animation-delay:0.6s]" />
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
