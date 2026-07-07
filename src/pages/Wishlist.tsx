import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ArrowRight, Trash } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import ProductCard from '../components/ui/ProductCard'
import { useWishlistStore } from '../store/wishlistStore'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useProducts } from '../hooks/useProducts'
import { useStoreContext } from '../contexts/StoreContext'

export default function Wishlist() {
  useDocumentTitle('Your Wishlist')
  const storeContext = useStoreContext()
  const currentStoreId = storeContext.storeId
  const items = useWishlistStore(s => s.items)
  const clear = useWishlistStore(s => s.clear)
  const remove = useWishlistStore(s => s.remove)

  const filteredItems = useMemo(() => {
    if (currentStoreId) {
      return items.filter(p => p.store_id === currentStoreId)
    }
    return items
  }, [items, currentStoreId])

  const shopPath = storeContext.storeSlug ? `/s/${storeContext.storeSlug}` : '/shop'

  return (
    <main className="w-full flex-1 max-w-7xl mx-auto px-4 py-6 sm:py-10 pb-28 lg:pb-10">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart size={14} weight="fill" className="text-red-500" />
            <span className="text-red-500 text-xs font-bold uppercase tracking-[0.2em]">Saved</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-semibold tracking-[-0.02em] text-dark-800 dark:text-white">
            Wishlist
          </h1>
          <p className="text-dark-800/50 dark:text-white/40 text-sm mt-3">
            {filteredItems.length === 0
              ? 'Tap the heart on any product to save it for later'
              : `${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'} saved`}
          </p>
        </div>
        {filteredItems.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear your saved items?')) {
                if (currentStoreId) {
                  filteredItems.forEach(item => remove(item.id))
                } else {
                  clear()
                }
              }
            }}
            className="text-dark-800/50 dark:text-white/40 hover:text-red-500 transition-colors text-xs font-medium flex items-center gap-1.5"
          >
            <Trash size={14} weight="duotone" />
            <span className="hidden sm:inline">Clear all</span>
          </button>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center text-center py-20"
        >
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-500/10 dark:to-red-500/5 flex items-center justify-center">
              <Heart size={42} weight="duotone" className="text-red-400" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full border-2 border-red-200 dark:border-red-500/30"
            />
          </div>
          <h3 className="text-xl font-display font-bold text-dark-800 dark:text-white mb-2">
            Your wishlist is empty
          </h3>
          <p className="text-dark-800/50 dark:text-white/40 text-sm max-w-xs mb-6">
            Save your favourite products by tapping the heart icon. They'll be waiting for you here.
          </p>
          <Link
            to={shopPath}
            className="btn-primary inline-flex items-center gap-2 text-sm mb-6"
          >
            Browse products <ArrowRight size={16} weight="bold" />
          </Link>
          <RecommendedProducts />
        </motion.div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredItems.map((p, i) => (
              <motion.div
                key={p.id}
                layout
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.25 }}
              >
                <ProductCard product={p} index={i} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </main>
  )
}

function RecommendedProducts() {
  const { data: featuredProducts, isLoading } = useProducts({ featured: true })

  if (isLoading || !featuredProducts || featuredProducts.length === 0) {
    return null
  }

  return (
    <div className="w-full mt-6 border-t border-cream-200 dark:border-white/10 pt-12 text-left">
      <h3 className="text-2xl font-display font-bold text-dark-800 dark:text-white mb-6 text-center">
        You Might Also Like
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        {featuredProducts.slice(0, 4).map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
