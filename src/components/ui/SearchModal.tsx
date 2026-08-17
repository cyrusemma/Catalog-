import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  MagnifyingGlass,
  X,
  Clock,
  Storefront,
  Tag,
  Package,
  CaretRight,
  ArrowRight,
  Flame,
  Eye
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useCategoryTree, useProducts } from '../../hooks/useProducts'
import { useRecentStore } from '../../store/recentStore'
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter'
import { effectivePrice } from '../../lib/utils'
import type { Product } from '../../types'

const RECENT_SEARCHES_KEY = 'catalog_recent_searches_v1'
const MAX_RECENT = 6

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const formatPrice = useCurrencyFormatter()

  // Auto-close search modal whenever route changes
  useEffect(() => {
    if (isOpen) onClose()
  }, [location.pathname])
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const { data: categoryTree } = useCategoryTree()
  const recentViewedProducts = useRecentStore(s => s.recent)
  const { data: featuredProducts = [] } = useProducts({ featured: true }, { enabled: isOpen })

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (saved) setRecentSearches(JSON.parse(saved))
    } catch {
      // Ignore storage errors
    }
  }, [isOpen])

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 180)
    return () => clearTimeout(timer)
  }, [query])

  // Auto focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setDebouncedQuery('')
    }
  }, [isOpen])

  // Global Keyboard Shortcuts (Cmd+K or Ctrl+K or Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const addRecentSearch = (term: string) => {
    const clean = term.trim()
    if (!clean) return
    const updated = [clean, ...recentSearches.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT)
    setRecentSearches(updated)
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch {
      // Ignore
    }
  }

  const removeRecentSearch = (term: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const updated = recentSearches.filter(s => s !== term)
    setRecentSearches(updated)
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch {
      // Ignore
    }
  }

  const clearAllRecent = () => {
    setRecentSearches([])
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  }

  // Live Query: Products
  const { data: productsResult = [], isFetching: isFetchingProducts } = useQuery({
    queryKey: ['live-search-products', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return []
      const { data, error } = await supabase
        .from('products')
        .select('*, store:stores(markup_percentage, name, slug)')
        .eq('is_published', true)
        .or(`title.ilike.%${debouncedQuery}%,description.ilike.%${debouncedQuery}%,category.ilike.%${debouncedQuery}%`)
        .order('is_featured', { ascending: false })
        .limit(6)
      if (error) return []
      return (data || []) as (Product & { store?: { name: string; slug: string } })[]
    },
    enabled: !!debouncedQuery && isOpen,
    staleTime: 1000 * 30,
  })

  // Live Query: Stores
  const { data: storesResult = [], isFetching: isFetchingStores } = useQuery({
    queryKey: ['live-search-stores', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return []
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, tagline, logo_url')
        .eq('approval_status', 'approved')
        .or(`name.ilike.%${debouncedQuery}%,tagline.ilike.%${debouncedQuery}%`)
        .limit(3)
      if (error) return []
      return data || []
    },
    enabled: !!debouncedQuery && isOpen && debouncedQuery.length >= 2,
    staleTime: 1000 * 60,
  })

  // Category Matches
  const matchingCategories = (categoryTree || []).filter(c =>
    debouncedQuery && c.name.toLowerCase().includes(debouncedQuery.toLowerCase())
  ).slice(0, 3)

  const handleSearchSubmit = (searchTerm: string) => {
    const finalTerm = searchTerm.trim()
    if (!finalTerm) return
    addRecentSearch(finalTerm)
    onClose()
    navigate(`/shop?q=${encodeURIComponent(finalTerm)}`)
  }

  const handleKeyDownInput = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const totalResults = productsResult.length + storesResult.length + matchingCategories.length

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-0 sm:pt-16 px-0 sm:px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="relative w-full sm:max-w-2xl bg-white/95 dark:bg-dark-900/95 backdrop-blur-2xl border-b sm:border border-cream-200 dark:border-white/10 rounded-b-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] sm:max-h-[84vh]"
          >
            {/* Top Bar / Search Input */}
            <div className="p-3.5 sm:p-4 border-b border-cream-100 dark:border-white/10 flex items-center gap-3">
              <MagnifyingGlass size={20} weight="bold" className="text-brand-400 flex-shrink-0 ml-1" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  handleKeyDownInput(e)
                  if (e.key === 'Enter') handleSearchSubmit(query)
                }}
                placeholder="Search products, stores, categories..."
                className="w-full bg-transparent text-dark-800 dark:text-white placeholder:text-dark-800/40 dark:placeholder:text-white/35 text-sm sm:text-base font-medium focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1.5 rounded-full hover:bg-cream-100 dark:hover:bg-white/10 text-dark-800/40 dark:text-white/40 transition-colors"
                >
                  <X size={16} weight="bold" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-semibold text-dark-800/40 dark:text-white/40 bg-cream-100 dark:bg-white/5 border border-cream-200 dark:border-white/10 rounded-lg">
                ESC
              </kbd>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
              {/* Empty Query State */}
              {!debouncedQuery && (
                <div className="space-y-5">
                  {/* User's Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/40 flex items-center gap-1.5">
                          <Clock size={13} weight="bold" /> Recent Searches
                        </span>
                        <button
                          type="button"
                          onClick={clearAllRecent}
                          className="text-[11px] text-dark-800/40 dark:text-white/40 hover:text-red-500 font-medium transition-colors"
                        >
                          Clear history
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term, i) => (
                          <div
                            key={i}
                            onClick={() => handleSearchSubmit(term)}
                            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream-50 dark:bg-white/5 hover:bg-brand-400/10 dark:hover:bg-brand-400/20 text-dark-800 dark:text-white border border-cream-200/70 dark:border-white/5 hover:border-brand-400/30 text-xs font-medium cursor-pointer transition-all"
                          >
                            <span>{term}</span>
                            <button
                              type="button"
                              onClick={e => removeRecentSearch(term, e)}
                              className="opacity-40 group-hover:opacity-100 hover:text-red-500 transition-opacity p-0.5"
                            >
                              <X size={12} weight="bold" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* User's Recently Viewed Products */}
                  {recentViewedProducts.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/40 flex items-center gap-1.5">
                        <Eye size={13} weight="bold" className="text-brand-400" /> Products You Viewed Recently
                      </span>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {recentViewedProducts.slice(0, 4).map(p => {
                          const priceVal = effectivePrice(p)
                          return (
                            <Link
                              key={p.id}
                              to={`/product/${p.slug}`}
                              onClick={onClose}
                              className="flex items-center gap-3 p-2 rounded-2xl bg-cream-50/70 dark:bg-white/5 hover:bg-brand-400/10 border border-cream-200/60 dark:border-white/5 cursor-pointer transition-all group"
                            >
                              <img
                                src={p.images?.[0] || 'https://placehold.co/40x40/f3f4f6/9ca3af?text=?'}
                                alt=""
                                className="w-10 h-10 rounded-xl object-cover bg-cream-100 dark:bg-dark-700 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-dark-800 dark:text-white truncate group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors">
                                  {p.title}
                                </p>
                                <p className="text-[11px] font-bold text-brand-400 mt-0.5">
                                  {formatPrice(priceVal)}
                                </p>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Real Featured / Trending Items in Catalog */}
                  {featuredProducts.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/40 flex items-center gap-1.5">
                        <Flame size={13} weight="bold" className="text-amber-500" /> Trending Products in Store
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {featuredProducts.slice(0, 6).map(p => (
                          <Link
                            key={p.id}
                            to={`/product/${p.slug}`}
                            onClick={onClose}
                            className="flex items-center px-3 py-1.5 rounded-xl bg-cream-50 dark:bg-white/5 hover:bg-brand-400 text-dark-800 dark:text-white hover:text-white border border-cream-200/70 dark:border-white/5 text-xs font-medium transition-all shadow-xs group"
                          >
                            <span className="truncate max-w-[150px]">{p.title}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category Shortcuts */}
                  {categoryTree && categoryTree.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-cream-100 dark:border-white/5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/40 flex items-center gap-1.5">
                        <Tag size={13} weight="bold" /> Browse Categories
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {categoryTree.filter(c => !c.parent_id).slice(0, 6).map(cat => (
                          <Link
                            key={cat.id}
                            to={`/shop/${cat.slug}`}
                            onClick={onClose}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-cream-50/60 dark:bg-white/5 hover:bg-brand-400/10 text-dark-800 dark:text-white text-xs font-semibold border border-cream-200/60 dark:border-white/5 transition-all text-left group"
                          >
                            <span className="truncate">{cat.name}</span>
                            <CaretRight size={12} weight="bold" className="text-dark-800/30 dark:text-white/30 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Active Search Results */}
              {debouncedQuery && (
                <div className="space-y-5">
                  {(isFetchingProducts || isFetchingStores) && totalResults === 0 && (
                    <div className="py-8 text-center space-y-2">
                      <div className="w-6 h-6 rounded-full border-2 border-brand-400 border-t-transparent animate-spin mx-auto" />
                      <p className="text-xs text-dark-800/50 dark:text-white/40">Searching catalog...</p>
                    </div>
                  )}

                  {!isFetchingProducts && totalResults === 0 && (
                    <div className="py-10 text-center space-y-2">
                      <Package size={40} className="text-dark-800/25 dark:text-white/20 mx-auto" weight="duotone" />
                      <p className="text-sm font-bold text-dark-800 dark:text-white">No exact matches found</p>
                      <p className="text-xs text-dark-800/50 dark:text-white/40">
                        Try checking your spelling or search for broader keywords.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSearchSubmit(debouncedQuery)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 rounded-xl bg-brand-400 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-amber-glow"
                      >
                        View all results on Shop <ArrowRight size={12} weight="bold" />
                      </button>
                    </div>
                  )}

                  {/* Matching Stores */}
                  {storesResult.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/40 flex items-center gap-1.5">
                        <Storefront size={13} weight="bold" className="text-brand-400" /> Stores ({storesResult.length})
                      </span>
                      <div className="grid sm:grid-cols-3 gap-2">
                        {storesResult.map(s => (
                          <Link
                            key={s.id}
                            to={`/s/${s.slug}`}
                            onClick={onClose}
                            className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-cream-50 dark:bg-white/5 hover:bg-brand-400/10 text-dark-800 dark:text-white border border-cream-200 dark:border-white/5 cursor-pointer transition-all"
                          >
                            {s.logo_url ? (
                              <img src={s.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-brand-400/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                                <Storefront size={16} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{s.name}</p>
                              <p className="text-[10px] text-dark-800/50 dark:text-white/40 truncate">{s.tagline || 'Merchant Store'}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Categories */}
                  {matchingCategories.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/40 flex items-center gap-1.5">
                        <Tag size={13} weight="bold" /> Categories
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {matchingCategories.map(c => (
                          <Link
                            key={c.id}
                            to={`/shop/${c.slug}`}
                            onClick={onClose}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-400/10 text-brand-500 dark:text-brand-400 border border-brand-400/20 text-xs font-bold hover:bg-brand-400/20 transition-all"
                          >
                            <span>{c.name}</span>
                            <CaretRight size={12} weight="bold" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Products */}
                  {productsResult.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/40 flex items-center gap-1.5">
                          <Package size={13} weight="bold" /> Products ({productsResult.length})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {productsResult.map(p => {
                          const priceVal = effectivePrice(p)
                          const isOutOfStock = p.stock_status === 'out_of_stock'
                          return (
                            <Link
                              key={p.id}
                              to={`/product/${p.slug}`}
                              onClick={onClose}
                              className="flex items-center gap-3 p-2.5 rounded-2xl bg-cream-50/70 dark:bg-white/5 hover:bg-brand-400/10 dark:hover:bg-brand-400/20 border border-cream-200/70 dark:border-white/5 hover:border-brand-400/30 cursor-pointer transition-all group"
                            >
                              <img
                                src={p.images?.[0] || 'https://placehold.co/48x48/f3f4f6/9ca3af?text=?'}
                                alt=""
                                className="w-12 h-12 rounded-xl object-cover bg-cream-100 dark:bg-dark-700 flex-shrink-0 border border-cream-200 dark:border-white/5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs sm:text-sm font-semibold text-dark-800 dark:text-white truncate group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors">
                                    {p.title}
                                  </p>
                                  {p.is_preorder && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 flex-shrink-0">
                                      PREORDER
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                                  <span className="font-bold text-brand-400">{formatPrice(priceVal)}</span>
                                  {p.store && (
                                    <span className="text-dark-800/40 dark:text-white/35 truncate">
                                      by {p.store.name}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isOutOfStock ? (
                                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-cream-200 dark:bg-white/10 text-dark-800/40 dark:text-white/40 flex-shrink-0">
                                  Out of stock
                                </span>
                              ) : (
                                <CaretRight size={14} weight="bold" className="text-dark-800/30 dark:text-white/30 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer with Search CTA & Shortcuts */}
            <div className="p-3 sm:p-4 bg-cream-50/80 dark:bg-white/5 border-t border-cream-100 dark:border-white/10 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => handleSearchSubmit(query)}
                className="flex items-center gap-1.5 font-bold text-brand-500 dark:text-brand-400 hover:underline"
              >
                <span>Search all results for "{query || '...'}"</span>
                <ArrowRight size={12} weight="bold" />
              </button>

              <div className="hidden sm:flex items-center gap-3 text-[11px] text-dark-800/40 dark:text-white/40">
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-cream-200 dark:bg-white/10 font-mono text-[10px]">⌘K</kbd> Toggle</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-cream-200 dark:bg-white/10 font-mono text-[10px]">↵</kbd> Select</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
