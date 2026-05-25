import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MagnifyingGlass, Faders, MagnifyingGlassMinus, CaretRight } from '@phosphor-icons/react'
import ProductCard from '../components/ui/ProductCard'
import SkeletonCard from '../components/ui/SkeletonCard'
import { useProducts, useCategories } from '../hooks/useProducts'

export default function Shop() {
  const [search, setSearch] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState(() => searchParams.get('category') || 'All')
  const [query, setQuery] = useState('')

  const { data: products, isLoading } = useProducts({
    category: activeCategory === 'All' ? undefined : activeCategory,
    search: query || undefined,
  })
  const { data: categories } = useCategories()

  const allCategories = ['All', ...(categories || [])]

  useEffect(() => {
    const cat = searchParams.get('category')
    setActiveCategory(cat || 'All')
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(search)
  }

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
    if (category === 'All') {
      setSearchParams({})
      return
    }
    setSearchParams({ category })
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto px-4 py-5 sm:py-10 pb-28 lg:pb-10">
      {/* Header */}
      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl sm:text-5xl font-display font-bold text-dark-800 dark:text-white mb-1 sm:mb-2 underline-gradient inline-block">
          Shop
        </h1>
        <p className="text-dark-800/50 dark:text-white/40 text-xs sm:text-sm mt-2 sm:mt-4">
          {products ? `Browse ${products.length} product${products.length !== 1 ? 's' : ''}` : 'Loading...'}
        </p>
      </div>

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
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 py-2.5 sm:py-3 text-sm"
            />
          </form>
          <button
            type="button"
            aria-label="Filters"
            className="glass px-3.5 rounded-xl flex items-center gap-2 text-dark-800/60 dark:text-white/60 hover:text-brand-400 transition-colors"
          >
            <Faders size={16} />
          </button>
        </div>

        {/* Category pills — horizontal scroll with fade + hint on mobile */}
        <div className="relative -mx-4 lg:mx-0">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-4 lg:px-0">
            {allCategories.map(cat => {
              const active = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`flex-shrink-0 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    active
                      ? 'bg-gradient-to-r from-brand-400 to-brand-500 text-white shadow-amber-glow'
                      : 'glass text-dark-800/70 dark:text-white/60 hover:text-brand-400'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
          {/* Fade + chevron scroll hint, mobile only */}
          <div
            aria-hidden="true"
            className="lg:hidden pointer-events-none absolute right-0 top-0 bottom-1 w-14 flex items-center justify-end pr-1 bg-gradient-to-l from-cream-50/95 dark:from-dark-900/95 via-cream-50/70 dark:via-dark-900/70 to-transparent"
          >
            <CaretRight size={14} weight="bold" className="text-brand-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Products grid */}
      {isLoading ? (
        <div className="product-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <div className="product-grid">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24">
          <MagnifyingGlassMinus size={56} weight="duotone" className="text-brand-400 mx-auto mb-4" />
          <h3 className="text-dark-800 dark:text-white font-semibold mb-2">No products found</h3>
          <p className="text-dark-800/50 dark:text-white/40 text-sm">Try a different search or category</p>
        </div>
      )}
    </main>
  )
}
