import { useState } from 'react'
import { MagnifyingGlass, Faders, MagnifyingGlassMinus } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import ProductCard from '../components/ui/ProductCard'
import { useProducts, useCategories } from '../hooks/useProducts'

export default function Shop() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [query, setQuery] = useState('')

  const { data: products, isLoading } = useProducts({
    category: activeCategory === 'All' ? undefined : activeCategory,
    search: query || undefined,
  })
  const { data: categories } = useCategories()

  const allCategories = ['All', ...(categories || [])]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(search)
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

      {/* Search + Filter */}
      <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6">
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

      {/* Category pills — glassmorphism */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 sm:mb-8 scrollbar-hide -mx-4 px-4">
        {allCategories.map(cat => {
          const active = activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
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

      {/* Products grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="aspect-[4/5] sm:aspect-square bg-cream-100 dark:bg-dark-700" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-cream-100 dark:bg-dark-700 rounded w-1/2" />
                <div className="h-4 bg-cream-100 dark:bg-dark-700 rounded w-3/4" />
                <div className="h-4 bg-cream-100 dark:bg-dark-700 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} compact />)}
        </motion.div>
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
