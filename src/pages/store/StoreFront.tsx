import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Image from '../../components/ui/Image'
import { useQuery } from '@tanstack/react-query'
import {
  Store,
  ShoppingBag,
  Package,
  Star,
  Instagram,
  Facebook,
  Video,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter'
import { useCustomerSession } from '../../hooks/useCustomerSession'
import { StoreContext } from '../../contexts/StoreContext'
import type { StoreContextValue } from '../../contexts/StoreContext'

interface StoreDetails {
  id: string
  name: string
  slug: string
  logo_url: string | null
  hero_images: string[]
  tagline: string | null
  social_instagram: string | null
  social_tiktok: string | null
  social_facebook: string | null
  whatsapp_number: string | null
  owner_id: string | null
  settings: Record<string, any>
}

interface Product {
  id: string
  title: string
  category: string
  selling_price: number
  images: string[]
  is_published: boolean
  is_featured: boolean
  stock_status: string
}

// ─── Share Store Link button ────────────────────────────────────────────────

function ShareStoreLinkButton({ storeSlug }: { storeSlug: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/s/${storeSlug}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check out my store!', url })
      } catch {
        // user cancelled
      }
      return
    }
    handleCopy()
  }

  return (
    <div className="flex items-center gap-2 bg-brand-400/10 border border-brand-400/25 rounded-2xl px-4 py-3">
      <ShoppingBag size={14} className="text-brand-400 flex-shrink-0" />
      <span className="text-xs text-dark-800/60 dark:text-white/50 truncate flex-1 font-mono">
        {url}
      </span>
      <button
        type="button"
        onClick={handleNativeShare}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
          copied
            ? 'bg-green-500 text-white'
            : 'bg-brand-400 hover:bg-brand-500 text-white shadow-sm'
        }`}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  )
}

// ─── Main StoreFront ─────────────────────────────────────────────────────────

export default function StoreFront() {
  const formatPrice = useCurrencyFormatter()
  const { storeSlug } = useParams<{ storeSlug: string }>()
  const { session } = useCustomerSession()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [sortBy, setSortBy] = useState<string>('newest')

  // 1. Fetch store info
  const { data: store, isLoading: isStoreLoading, isError: isStoreError } = useQuery<StoreDetails>({
    queryKey: ['store', storeSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', storeSlug)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!storeSlug,
  })

  // 2. Fetch products belonging to this store only
  const { data: products, isLoading: isProductsLoading } = useQuery<Product[]>({
    queryKey: ['store-products', store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', store?.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!store?.id,
  })

  if (isStoreLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-400 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Opening storefront...</p>
        </div>
      </div>
    )
  }

  if (isStoreError || !store) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-sm">
          <Store size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Store Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">
            The storefront URL you are trying to reach doesn't exist or has been deactivated.
          </p>
          <Link
            to="/"
            className="inline-block bg-brand-400 hover:bg-brand-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            Go to Marketplace
          </Link>
        </div>
      </div>
    )
  }

  // Build StoreContext value — this is what makes the entire subtree tenant-isolated
  const ctxValue: StoreContextValue = {
    storeSlug: store.slug,
    storeId: store.id,
    storeName: store.name,
    logoUrl: store.logo_url,
    tagline: store.tagline,
    socialInstagram: store.social_instagram,
    socialTiktok: store.social_tiktok,
    socialFacebook: store.social_facebook,
    whatsappNumber: store.whatsapp_number,
    ownerId: store.owner_id,
  }

  const isOwner = !!session?.user?.id && session.user.id === store.owner_id

  const categories = ['All', ...Array.from(new Set(products?.map(p => p.category).filter(Boolean)))]
  const featuredProducts = products?.filter(p => p.is_featured) || []

  const filtered = products
    ?.filter(p => {
      const matchesSearch = p.title?.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.selling_price - b.selling_price
      if (sortBy === 'price_desc') return b.selling_price - a.selling_price
      return 0
    })

  return (
    <StoreContext.Provider value={ctxValue}>
      <div id="store-top" className="flex-1 bg-cream-50 dark:bg-dark-900 min-h-screen">
        {/* Cover image */}
        {store.hero_images?.[0] && (
          <div className="w-full h-48 md:h-64 lg:h-80 relative bg-gray-100 dark:bg-dark-800">
            <Image
              src={store.hero_images[0]}
              alt="Store Cover"
              className="w-full h-full object-cover"
              priority={true}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        <header
          className={`bg-white dark:bg-dark-800 border-b border-cream-200 dark:border-white/10 px-4 pb-8 ${
            store.hero_images?.[0] ? 'pt-0' : 'py-8'
          }`}
        >
          <div
            className={`max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6 ${
              store.hero_images?.[0] ? '-mt-12 relative z-10' : ''
            }`}
          >
            {/* Logo */}
            {store.logo_url ? (
              <Image
                src={store.logo_url}
                alt={store.name}
                className="w-24 h-24 rounded-2xl object-cover shadow-lg border-4 border-white dark:border-dark-800 flex-shrink-0"
                priority={true}
              />
            ) : (
              <div className="w-24 h-24 bg-white dark:bg-dark-800 rounded-2xl flex items-center justify-center border-4 border-white dark:border-dark-800 shadow-lg flex-shrink-0">
                <div className="w-full h-full bg-brand-400/10 rounded-xl flex items-center justify-center">
                  <Store size={40} className="text-brand-400" />
                </div>
              </div>
            )}

            {/* Store info */}
            <div className="text-center md:text-left flex-1 mt-2 md:mt-0 pt-2 md:pt-12">
              <h1 className="text-3xl font-display font-semibold text-gray-900 dark:text-white">
                {store.name}
              </h1>
              {store.tagline && (
                <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm max-w-2xl">
                  {store.tagline}
                </p>
              )}

              {/* Share link — prominent for the owner, subtle info for everyone else */}
              {isOwner ? (
                <div className="mt-4 max-w-md">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">
                    Your store link — share with customers
                  </p>
                  <ShareStoreLinkButton storeSlug={store.slug} />
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-2 flex items-center justify-center md:justify-start gap-1">
                  <ShoppingBag size={14} />
                  {window.location.host}/s/{store.slug}
                </p>
              )}
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3 mt-4 md:mt-12">
              {store.social_instagram && (
                <a
                  href={store.social_instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-50 dark:bg-dark-900 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-brand-400 transition-colors"
                >
                  <Instagram size={18} />
                </a>
              )}
              {store.social_facebook && (
                <a
                  href={store.social_facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-50 dark:bg-dark-900 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-brand-400 transition-colors"
                >
                  <Facebook size={18} />
                </a>
              )}
              {store.social_tiktok && (
                <a
                  href={store.social_tiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-50 dark:bg-dark-900 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-brand-400 transition-colors"
                >
                  <Video size={18} />
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Main Catalog */}
        <main id="products" className="max-w-7xl mx-auto px-4 py-8">
          {/* Featured */}
          {!isProductsLoading &&
            featuredProducts.length > 0 &&
            search === '' &&
            selectedCategory === 'All' && (
              <div className="mb-12">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Star className="text-brand-400" size={20} fill="currentColor" /> Featured
                  Selection
                </h2>
                <div className="flex overflow-x-auto pb-6 -mx-4 px-4 snap-x snap-mandatory hide-scrollbar gap-4">
                  {featuredProducts.map(product => (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}?store=${store.slug}`}
                      className="snap-start shrink-0 w-64 group bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-gray-50 relative">
                        <img
                          src={
                            product.images?.[0] ||
                            'https://placehold.co/300x300/f3f4f6/9ca3af?text=?'
                          }
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-brand-400 mb-1 block">
                            {product.category}
                          </span>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 leading-tight group-hover:text-brand-400 transition-colors">
                            {product.title}
                          </h3>
                        </div>
                        <div className="mt-4">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatPrice(product.selling_price)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          {/* Search + Sort + Category filter */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder={`Search within ${store.name}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/20 rounded-2xl px-5 py-3.5 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all shadow-sm text-sm"
              />
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 rounded-2xl pl-5 pr-12 py-3.5 text-sm text-gray-900 dark:text-white outline-none focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/20 shadow-sm cursor-pointer"
                >
                  <option value="newest">Newest Arrivals</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Category pills */}
            {categories.length > 1 && (
              <div className="relative -mx-4 lg:mx-0">
                <div className="flex overflow-x-auto pb-2 scrollbar-hide px-4 lg:px-0 scroll-smooth snap-x snap-proximity overscroll-x-contain [-webkit-overflow-scrolling:touch] gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`shrink-0 snap-start px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        selectedCategory === cat
                          ? 'bg-brand-400 text-white shadow-sm'
                          : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-300 border border-cream-200 dark:border-white/10 hover:border-brand-400/30'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {/* Edge fade to signal more pills */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-cream-50/95 dark:from-dark-900/95 to-transparent"
                />
              </div>
            )}
          </div>

          {/* Products Grid */}
          {isProductsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 rounded-3xl h-72"
                />
              ))}
            </div>
          ) : filtered?.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 rounded-3xl">
              <Package size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                No products matching your search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered?.map(product => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}?store=${store.slug}`}
                  className="group bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 hover:border-brand-400/30 dark:hover:border-brand-400/30 rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full"
                >
                  <div className="aspect-square w-full overflow-hidden bg-gray-50 relative">
                    <img
                      src={
                        product.images?.[0] || 'https://placehold.co/300x300/f3f4f6/9ca3af?text=?'
                      }
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-brand-400 block">
                          {product.category}
                        </span>
                        {product.is_featured && (
                          <span className="bg-yellow-50 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-yellow-200 dark:border-yellow-800/30">
                            <Star size={10} fill="currentColor" /> Featured
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 leading-tight group-hover:text-brand-400 transition-colors">
                        {product.title}
                      </h3>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatPrice(product.selling_price)}
                      </span>
                      {product.stock_status === 'out_of_stock' && (
                        <span className="text-[10px] font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-md">
                          Sold Out
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </StoreContext.Provider>
  )
}
