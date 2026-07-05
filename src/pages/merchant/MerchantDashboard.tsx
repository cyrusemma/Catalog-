/**
 * MerchantDashboard — Scoped merchant admin surface
 *
 * Only shows data belonging to this merchant's store. Never leaks platform-level
 * data. Mirrors the Shopify mental model: this is the merchant's own "admin"
 * that is entirely separate from the platform admin (/admin).
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import {
  Storefront,
  Package,
  ShoppingBag,
  Star,
  Copy,
  Check,
  ArrowSquareOut,
  Gear,
  SignOut,
  ChartBar,
  Warning,
} from '@phosphor-icons/react'
import { supabase } from '../../lib/supabase'
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter'

interface MerchantStore {
  id: string
  name: string
  slug: string
  logo_url: string | null
  tagline: string | null
  approval_status?: string
  created_at: string
}

// ─── Copy Store Link ─────────────────────────────────────────────────────────

function CopyStoreLinkRow({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/s/${slug}`

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(url) } catch { /* ignore */ }
    setCopied(true)
    toast.success('Store link copied to clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex items-center gap-3 bg-brand-400/8 border border-brand-400/20 rounded-2xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-400 mb-0.5">
          Your store link
        </p>
        <p className="text-sm text-dark-800/70 dark:text-white/60 font-mono truncate">{url}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={`/s/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-dark-800/50 dark:text-white/40 hover:text-brand-400 transition-colors"
          title="Open store"
        >
          <ArrowSquareOut size={16} />
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-brand-400 hover:bg-brand-500 text-white shadow-sm'
          }`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon size={22} weight="duotone" className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-dark-800 dark:text-white">{value}</p>
        <p className="text-xs text-dark-800/50 dark:text-white/40 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function MerchantDashboard() {
  const formatPrice = useCurrencyFormatter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null)
    })
  }, [])

  const { data: store, isLoading: storeLoading } = useQuery<MerchantStore>({
    queryKey: ['merchant-store', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', userId!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['merchant-products', store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, selling_price, images, is_published, stock_status, approval_status, created_at')
        .eq('store_id', store!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!store?.id,
  })

  const { data: orders } = useQuery({
    queryKey: ['merchant-orders', store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, total, created_at')
        .eq('store_id', store!.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data || []
    },
    enabled: !!store?.id,
  })

  const { data: pendingReviews } = useQuery({
    queryKey: ['merchant-pending-reviews', store?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('product_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store!.id)
        .eq('status', 'pending')
      return count ?? 0
    },
    enabled: !!store?.id,
  })

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (storeLoading || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-400" />
      </div>
    )
  }

  const publishedCount = products?.filter(p => p.is_published).length ?? 0
  const pendingApproval = products?.filter(p => p.approval_status === 'pending').length ?? 0

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-dark-900">
      {/* Header */}
      <header className="bg-white dark:bg-dark-800 border-b border-cream-200 dark:border-white/10 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-brand-400/10 flex items-center justify-center">
                <Storefront size={20} weight="duotone" className="text-brand-400" />
              </div>
            )}
            <div>
              <h1 className="font-display font-bold text-dark-800 dark:text-white leading-tight">
                {store.name}
              </h1>
              <p className="text-xs text-dark-800/50 dark:text-white/40">Merchant Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/s/${store.slug}`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-500 transition-colors"
            >
              <ArrowSquareOut size={14} /> View store
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-dark-800/50 dark:text-white/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              title="Sign out"
            >
              <SignOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Share link — top of page, high visibility */}
        <CopyStoreLinkRow slug={store.slug} />

        {/* Pending review alert */}
        {(pendingReviews ?? 0) > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl px-4 py-3">
            <Warning size={18} className="text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
              <span className="font-semibold">{pendingReviews} review{(pendingReviews ?? 0) > 1 ? 's' : ''}</span> awaiting your approval.
            </p>
            <Link
              to="/admin/reviews"
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Review →
            </Link>
          </div>
        )}

        {/* Stats */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-dark-800/50 dark:text-white/40 mb-4">
            Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              label="Total Products"
              value={products?.length ?? 0}
              icon={Package}
              color="bg-brand-400"
            />
            <StatCard
              label="Published"
              value={publishedCount}
              icon={ChartBar}
              color="bg-green-500"
            />
            <StatCard
              label="Pending Approval"
              value={pendingApproval}
              icon={Star}
              color="bg-amber-500"
            />
          </div>
        </section>

        {/* Recent products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-dark-800/50 dark:text-white/40">
              Your Products
            </h2>
            <Link
              to="/admin/products"
              className="text-xs font-semibold text-brand-400 hover:text-brand-500"
            >
              Manage all →
            </Link>
          </div>

          {productsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-16 bg-cream-100 dark:bg-dark-800 rounded-2xl" />
              ))}
            </div>
          ) : !products || products.length === 0 ? (
            <div className="card p-8 text-center">
              <Package size={36} className="text-dark-800/20 dark:text-white/20 mx-auto mb-3" />
              <p className="text-dark-800/50 dark:text-white/40 text-sm font-medium mb-4">
                No products yet
              </p>
              <Link to="/admin/products/new" className="btn-primary text-sm py-2 px-6">
                Add your first product
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {products.slice(0, 6).map(product => (
                <div
                  key={product.id}
                  className="card p-4 flex items-center gap-3 hover:shadow-sm transition-shadow"
                >
                  <img
                    src={product.images?.[0] || 'https://placehold.co/48x48/f3f4f6/9ca3af?text=?'}
                    alt={product.title}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-cream-100"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-dark-800 dark:text-white text-sm truncate">
                      {product.title}
                    </p>
                    <p className="text-xs text-dark-800/50 dark:text-white/40 mt-0.5">
                      {formatPrice(product.selling_price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        product.is_published
                          ? 'bg-green-100 text-green-600 dark:bg-green-950/30 dark:text-green-400'
                          : 'bg-cream-100 dark:bg-white/10 text-dark-800/50 dark:text-white/40'
                      }`}
                    >
                      {product.is_published ? 'Published' : 'Draft'}
                    </span>
                    {product.approval_status === 'pending' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {(products?.length ?? 0) > 6 && (
                <p className="text-xs text-center text-dark-800/40 dark:text-white/30 py-2">
                  +{(products?.length ?? 0) - 6} more products
                </p>
              )}
            </div>
          )}
        </section>

        {/* Recent orders */}
        {orders && orders.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-dark-800/50 dark:text-white/40">
                Recent Orders
              </h2>
              <Link to="/admin/orders" className="text-xs font-semibold text-brand-400 hover:text-brand-500">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {orders.map((order: any) => (
                <div key={order.id} className="card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-400/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={18} weight="duotone" className="text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-dark-800/50 dark:text-white/40 truncate">
                      #{order.id.slice(0, 8)}
                    </p>
                    <p className="font-semibold text-dark-800 dark:text-white text-sm">
                      {formatPrice(order.total)}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                      order.status === 'delivered'
                        ? 'bg-green-100 text-green-600 dark:bg-green-950/30 dark:text-green-400'
                        : order.status === 'cancelled'
                        ? 'bg-red-100 text-red-500 dark:bg-red-950/20 dark:text-red-400'
                        : 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick actions */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-dark-800/50 dark:text-white/40 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Add Product', Icon: Package, to: '/admin/products/new', color: 'text-brand-400' },
              { label: 'View Orders', Icon: ShoppingBag, to: '/admin/orders', color: 'text-blue-500' },
              { label: 'Reviews', Icon: Star, to: '/admin/reviews', color: 'text-amber-500' },
              { label: 'Store Settings', Icon: Gear, to: '/admin/settings', color: 'text-gray-500' },
            ].map(({ label, Icon, to, color }) => (
              <Link
                key={label}
                to={to}
                className="card p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow group"
              >
                <Icon size={24} weight="duotone" className={`${color} group-hover:scale-110 transition-transform`} />
                <span className="text-xs font-semibold text-dark-800 dark:text-white">{label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
