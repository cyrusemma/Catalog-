import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Package, Eye, ShoppingBag, TrendingUp, Plus, ArrowRight, Settings, MessageSquareQuote, Users } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [products, orders, reviews, visits] = await Promise.all([
        supabase.from('products').select('id, is_published, selling_price'),
        supabase.from('orders').select('id, total, status'),
        supabase.from('site_reviews').select('id, rating'),
        // RLS already restricts this to admins; a wide select is fine at this volume.
        supabase.from('visits').select('session_id'),
      ])
      const allProducts = products.data || []
      const allOrders = orders.data || []
      const allReviews = reviews.data || []
      const allVisits = visits.data || []
      const revenue = allOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)
      const uniqueVisitors = new Set(allVisits.map(v => v.session_id)).size
      return {
        total: allProducts.length,
        published: allProducts.filter(p => p.is_published).length,
        orders: allOrders.length,
        reviews: allReviews.length,
        revenue,
        visits: allVisits.length,
        uniqueVisitors,
      }
    },
  })

  const { data: recentProducts } = useQuery({
    queryKey: ['admin-recent-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false }).limit(5)
      return data || []
    },
  })

  const quickActions = [
    { label: 'Add Product', desc: 'Create a new product manually', icon: Package, color: 'bg-brand-400', to: '/admin/products/new' },
    { label: 'View Orders', desc: 'Manage customer orders', icon: ShoppingBag, color: 'bg-blue-500', to: '/admin/orders' },
    { label: 'Read Reviews', desc: 'See ratings and site feedback', icon: MessageSquareQuote, color: 'bg-emerald-500', to: '/admin/reviews' },
    { label: 'Store Settings', desc: 'Name, WhatsApp, colors', icon: Settings, color: 'bg-gray-400', to: '/admin/settings' },
  ]

  const statCards = [
    { label: 'Total Products', value: stats?.total ?? '—', icon: Package, color: 'bg-brand-400' },
    { label: 'Published', value: stats?.published ?? '—', icon: Eye, color: 'bg-green-500' },
    { label: 'Orders', value: stats?.orders ?? '—', icon: ShoppingBag, color: 'bg-blue-500' },
    { label: 'Reviews', value: stats?.reviews ?? '—', icon: MessageSquareQuote, color: 'bg-emerald-500' },
    { label: 'Revenue', value: stats ? formatPrice(stats.revenue) : '—', icon: TrendingUp, color: 'bg-purple-500' },
    {
      label: 'Visits',
      value: stats ? `${stats.visits.toLocaleString()} · ${stats.uniqueVisitors.toLocaleString()} unique` : '—',
      icon: Users,
      color: 'bg-amber-500',
    },
  ]

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 pb-28 lg:pb-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5 sm:mb-7">
          <div className="min-w-0">
            <p className="text-gray-400 text-xs sm:text-sm mb-0.5">Dashboard</p>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Overview</h1>
          </div>
          <Link
            to="/admin/products/new"
            className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-500 text-white font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-colors text-xs sm:text-sm flex-shrink-0"
          >
            <Plus size={14} />
            Add Product
          </Link>
        </div>

        {/* Stats — at the top on mobile so the most-glanced numbers are above the fold. */}
        <section className="mb-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2.5 px-1">At a glance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {statCards.map(card => (
              <div
                key={card.label}
                className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-gray-500 text-[11px] sm:text-xs font-medium truncate">{card.label}</p>
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 ${card.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <card.icon size={14} className="text-white" />
                  </div>
                </div>
                <p className="text-lg sm:text-xl font-bold text-gray-900 leading-tight break-words">
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2.5 px-1">Quick actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {quickActions.map(action => (
              <Link
                key={action.label}
                to={action.to}
                className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 hover:border-brand-400/30 hover:shadow-sm transition-all flex items-center gap-3 group"
              >
                <div className={`w-10 h-10 sm:w-11 sm:h-11 ${action.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <action.icon size={17} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-gray-900 font-medium text-sm leading-tight">{action.label}</p>
                  <p className="text-gray-400 text-[11px] mt-0.5 line-clamp-2">{action.desc}</p>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-brand-400 transition-colors flex-shrink-0 hidden sm:block" />
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Products */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Recent Products</h2>
            <Link to="/admin/products" className="text-brand-400 text-xs sm:text-sm font-medium hover:text-brand-500">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentProducts?.map(product => (
              <Link
                key={product.id}
                to={`/admin/products/${product.id}/edit`}
                className="flex items-center gap-3 p-3 sm:p-4 hover:bg-gray-50/50 transition-colors"
              >
                <img
                  src={product.images?.[0] || 'https://placehold.co/40x40/f3f4f6/9ca3af?text=?'}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm font-medium truncate">{product.title}</p>
                  <p className="text-gray-400 text-xs">{formatPrice(product.selling_price)}</p>
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                    product.is_published ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {product.is_published ? 'Live' : 'Draft'}
                </span>
              </Link>
            ))}
            {(!recentProducts || recentProducts.length === 0) && (
              <p className="text-gray-400 text-sm text-center py-8">No products yet.</p>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
