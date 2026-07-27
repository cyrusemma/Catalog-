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
import { motion, AnimatePresence } from 'framer-motion'
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
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className="card p-5 flex items-center gap-4 relative overflow-hidden group border border-cream-200/50 dark:border-white/5"
    >
      <div className={`absolute -right-6 -top-6 w-24 h-24 ${color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
        <Icon size={22} weight="duotone" className="text-white" />
      </div>
      <div className="relative z-10">
        <p className="text-2xl font-display font-bold text-dark-800 dark:text-white">{value}</p>
        <p className="text-xs text-dark-800/50 dark:text-white/40 font-medium mt-0.5">{label}</p>
      </div>
    </motion.div>
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
    <div className="min-h-screen bg-cream-50 dark:bg-dark-900 overflow-x-hidden">
      {/* Decorative background gradients */}
      <div className="fixed top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-brand-400/5 to-transparent pointer-events-none -z-10" />
      <div className="fixed -top-32 -right-32 w-96 h-96 bg-brand-400/20 blur-[100px] rounded-full pointer-events-none -z-10" />
      <div className="fixed top-1/4 -left-32 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-cream-200/50 dark:border-white/5 px-4 py-4 sticky top-0 z-50"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-10 h-10 rounded-xl object-cover shadow-sm border border-cream-200 dark:border-white/10" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400/20 to-brand-400/5 flex items-center justify-center border border-brand-400/20">
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
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-400 hover:bg-brand-400/10 transition-colors"
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
      </motion.header>

      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
        className="max-w-4xl mx-auto px-4 py-8 space-y-8"
      >
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

        <motion.section variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-dark-800/50 dark:text-white/40 mb-4 flex items-center gap-2">
            <ChartBar size={16} weight="duotone" /> Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              label="Total Products"
              value={products?.length ?? 0}
              icon={Package}
              color="bg-gradient-to-br from-brand-400 to-brand-500"
            />
            <StatCard
              label="Published"
              value={publishedCount}
              icon={Check}
              color="bg-gradient-to-br from-green-400 to-green-500"
            />
            <StatCard
              label="Pending Approval"
              value={pendingApproval}
              icon={Star}
              color="bg-gradient-to-br from-amber-400 to-amber-500"
            />
          </div>
        </motion.section>

        {/* Recent products */}
        <motion.section variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-dark-800/50 dark:text-white/40 flex items-center gap-2">
              <Package size={16} weight="duotone" /> Your Products
            </h2>
            <Link
              to="/admin/products"
              className="text-xs font-semibold text-brand-400 hover:text-brand-500 bg-brand-400/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              Manage all →
            </Link>
          </div>

          {productsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-16 bg-white/50 dark:bg-dark-800/50 rounded-2xl flex items-center px-4 gap-3">
                  <div className="w-12 h-12 bg-cream-200 dark:bg-white/5 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-cream-200 dark:bg-white/5 rounded-full w-1/3" />
                    <div className="h-2 bg-cream-200 dark:bg-white/5 rounded-full w-1/4" />
                  </div>
                </div>
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
        </motion.section>

        {/* Recent orders */}
        {orders && orders.length > 0 && (
          <motion.section variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-dark-800/50 dark:text-white/40 flex items-center gap-2">
                <ShoppingBag size={16} weight="duotone" /> Recent Orders
              </h2>
              <Link to="/admin/orders" className="text-xs font-semibold text-brand-400 hover:text-brand-500 bg-brand-400/10 px-3 py-1.5 rounded-lg transition-colors">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {orders.map((order: any) => (
                <div key={order.id} className="card p-4 flex items-center gap-3 hover:border-brand-400/30 transition-colors border border-transparent">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400/20 to-brand-400/5 flex items-center justify-center flex-shrink-0">
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
                    className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 border ${
                      order.status === 'delivered'
                        ? 'bg-green-100/50 border-green-200 text-green-600 dark:bg-green-950/30 dark:border-green-800/50 dark:text-green-400'
                        : order.status === 'cancelled'
                        ? 'bg-red-100/50 border-red-200 text-red-500 dark:bg-red-950/20 dark:border-red-800/50 dark:text-red-400'
                        : 'bg-amber-100/50 border-amber-200 text-amber-600 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-400'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Quick actions */}
        <motion.section variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-dark-800/50 dark:text-white/40 mb-4 flex items-center gap-2">
            <Gear size={16} weight="duotone" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Add Product', Icon: Package, to: '/admin/products/new', color: 'text-brand-400' },
              { label: 'View Orders', Icon: ShoppingBag, to: '/admin/orders', color: 'text-blue-500' },
              { label: 'Reviews', Icon: Star, to: '/admin/reviews', color: 'text-amber-500' },
              { label: 'Settings', Icon: Gear, to: '/admin/settings', color: 'text-dark-400 dark:text-white/70' },
            ].map(({ label, Icon, to, color }) => (
              <Link
                key={label}
                to={to}
                className="card p-4 flex flex-col items-center gap-2 text-center hover:shadow-lg hover:-translate-y-1 transition-all group border border-cream-200/50 dark:border-white/5 bg-white/50 dark:bg-dark-800/50 backdrop-blur-md"
              >
                <div className={`p-3 rounded-full bg-cream-100 dark:bg-white/5 group-hover:scale-110 transition-transform ${color}`}>
                  <Icon size={24} weight="duotone" />
                </div>
                <span className="text-xs font-bold text-dark-800 dark:text-white">{label}</span>
              </Link>
            ))}
          </div>
        </motion.section>
      </motion.div>
    </div>
  )
}
