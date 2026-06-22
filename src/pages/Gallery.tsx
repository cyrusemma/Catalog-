import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass, X, SquaresFour, GridNine, Rows } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProducts } from '../hooks/useProducts'
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter'
import SkeletonCard from '../components/ui/SkeletonCard'
// Note: Product type uses `images: string[]` (not `image_url`).

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
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(PRODUCT_CHUNK_SIZE)
  const [layout, setLayout] = useState<LayoutMode>('grid')
  const observerTarget = useRef<HTMLDivElement>(null)

  const { data: products, isLoading, isError, error } = useProducts({
    search: query || undefined,
  })

  const visibleProducts = products?.slice(0, visibleCount) ?? []
  const hasMoreProducts = Boolean(products && products.length > visibleCount)

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
    setVisibleCount(PRODUCT_CHUNK_SIZE)
  }

  const handleClearSearch = () => {
    setSearch('')
    setQuery('')
    setVisibleCount(PRODUCT_CHUNK_SIZE)
  }

  // ── Magazine: every 5th item (index % 5 === 0) is a featured 2×2 tile ──
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
      {!isLoading && products && products.length === 0 && (
        <div className="text-center py-20">
          <p className="text-dark-800/60 dark:text-white/60 text-lg">
            {query ? 'No products found matching your search' : 'No products available'}
          </p>
        </div>
      )}

      {/* Image Grid */}
      {products && products.length > 0 && (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={layout}
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
                  : layout === 'compact'
                  ? 'aspect-square'
                  : 'aspect-square'

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
                    onClick={() => navigate(`/product/${product.id}`)}
                    className={`group cursor-pointer ${aspectClass}`}
                  >
                    <div className="relative overflow-hidden rounded-xl bg-cream-100 dark:bg-white/5 w-full h-full">
                      {(product.images?.[0] ?? '') ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cream-200 to-cream-300 dark:from-white/10 dark:to-white/5">
                          <span className="text-dark-800/20 dark:text-white/20 text-center px-2 text-xs font-medium line-clamp-2">
                            {product.title}
                          </span>
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                      {/* Featured badge (magazine only) */}
                      {featured && (
                        <div className="absolute top-2 left-2">
                          <span className="bg-brand-400/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-amber-glow">
                            ✦ Featured
                          </span>
                        </div>
                      )}

                      {/* Price Badge */}
                      <div className="absolute bottom-2 left-2 right-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-brand-400 text-white px-3 py-1 rounded-full shadow-amber-glow border border-white/20">
                          <p className={`font-bold tracking-wide ${featured ? 'text-base' : layout === 'compact' ? 'text-[11px]' : 'text-sm'}`}>
                            {formatPrice(product.selling_price)}
                          </p>
                        </div>
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
              <div className="animate-pulse flex gap-1">
                <div className="w-2 h-2 rounded-full bg-brand-400" />
                <div className="w-2 h-2 rounded-full bg-brand-400" style={{ animation: 'pulse 1.5s ease-in-out 0.3s infinite' }} />
                <div className="w-2 h-2 rounded-full bg-brand-400" style={{ animation: 'pulse 1.5s ease-in-out 0.6s infinite' }} />
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
