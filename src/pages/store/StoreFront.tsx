import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Store, ShoppingBag, Package, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter'

interface StoreDetails {
  id: string
  name: string
  slug: string
  logo_url: string | null
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

export default function StoreFront() {
  const formatPrice = useCurrencyFormatter()
  const { storeSlug } = useParams<{ storeSlug: string }>()
  const [search, setSearch] = useState('')

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

  // 2. Fetch products belonging to this store
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Store Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">
            The storefront URL you are trying to reach doesn't exist or has been deactivated.
          </p>
          <Link to="/" className="inline-block bg-brand-400 hover:bg-brand-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm">
            Go to Marketplace
          </Link>
        </div>
      </div>
    )
  }

  const filtered = products?.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 bg-cream-50 dark:bg-dark-900 min-h-screen">
      {/* Store Header */}
      <header className="bg-white dark:bg-dark-800 border-b border-cream-200 dark:border-white/10 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6">
          {store.logo_url ? (
            <img
              src={store.logo_url}
              alt={store.name}
              className="w-20 h-20 rounded-2xl object-cover shadow-md border border-gray-100 flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 bg-brand-400/10 rounded-2xl flex items-center justify-center border border-brand-400/20 flex-shrink-0">
              <Store size={36} className="text-brand-400" />
            </div>
          )}

          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-display font-semibold text-gray-900 dark:text-white">
              {store.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center md:justify-start gap-1">
              <ShoppingBag size={14} /> Storefront link: {window.location.host}/s/{store.slug}
            </p>
          </div>
        </div>
      </header>

      {/* Main Catalog View */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder={`Search within ${store.name}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/20 rounded-2xl px-5 py-3.5 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all shadow-sm text-sm"
          />
        </div>

        {/* Products Grid */}
        {isProductsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 rounded-3xl h-72" />
            ))}
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 rounded-3xl">
            <Package size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No products matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered?.map(product => (
              <Link
                key={product.id}
                to={`/product/${product.id}?store=${store.slug}`}
                className="group bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 hover:border-brand-400/30 dark:hover:border-brand-400/30 rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full"
              >
                {/* Image */}
                <div className="aspect-square w-full overflow-hidden bg-gray-50 relative">
                  <img
                    src={product.images?.[0] || 'https://placehold.co/300x300/f3f4f6/9ca3af?text=?'}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {product.is_featured && (
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-brand-400 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-0.5">
                      <Star size={10} fill="currentColor" /> Featured
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-brand-400 mb-1 block">
                      {product.category}
                    </span>
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
  )
}
