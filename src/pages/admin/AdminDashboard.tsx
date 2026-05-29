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
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gray-400 text-sm mb-1">Dashboard</p>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <Link to="/admin/products/new" className="flex items-center gap-2 bg-brand-400 hover:bg-brand-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm">
            <Plus size={16} /> Add Product
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {quickActions.map(action => (
            <Link key={action.label} to={action.to} className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-brand-400/30 hover:shadow-sm transition-all flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center`}>
                  <action.icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-sm">{action.label}</p>
                  <p className="text-gray-400 text-xs">{action.desc}</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
            </Link>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {statCards.map(card => (
            <div key={card.label} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 text-sm">{card.label}</p>
                <div className={`w-9 h-9 ${card.color} rounded-xl flex items-center justify-center`}>
                  <card.icon size={16} className="text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Recent Products */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Products</h2>
            <Link to="/admin/products" className="text-brand-400 text-sm font-medium hover:text-brand-500">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentProducts?.map(product => (
              <div key={product.id} className="flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors">
                <img src={product.images?.[0] || 'https://placehold.co/40x40/f3f4f6/9ca3af?text=?'} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm font-medium truncate">{product.title}</p>
                  <p className="text-gray-400 text-xs">{formatPrice(product.selling_price)}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${product.is_published ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {product.is_published ? 'Live' : 'Draft'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
