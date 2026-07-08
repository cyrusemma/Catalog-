import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAdminContext } from '../../hooks/useAdminContext'
import { 
  Package, 
  Eye, 
  ShoppingBag, 
  TrendingUp, 
  Plus, 
  ArrowRight, 
  Settings, 
  MessageSquareQuote, 
  Users, 
  BarChart3, 
  Star, 
  Store, 
  Calendar, 
  ChevronDown 
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

export default function AdminDashboard() {
  const { data: context } = useAdminContext()
  const [timeframe, setTimeframe] = useState<number>(30)
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area')

  const { data: rawStats } = useQuery({
    queryKey: ['admin-stats-raw', context?.storeId, context?.isAdmin],
    queryFn: async () => {
      const storeId = context?.storeId
      const isAdmin = context?.isAdmin

      const promises: any[] = [
        (() => {
          let q = supabase.from('products').select('id, is_published, selling_price')
          if (storeId) q = q.eq('store_id', storeId)
          return q
        })(),
        (() => {
          let q = supabase.from('orders').select('id, total, status, created_at, items')
          if (storeId) q = q.eq('store_id', storeId)
          return q
        })(),
      ]

      if (isAdmin) {
        promises.push(supabase.from('site_reviews').select('id, rating'))
        promises.push(supabase.from('visits').select('session_id, created_at'))
      }

      const results = await Promise.all(promises)
      const productsData = results[0].data || []
      const ordersData = results[1].data || []
      const reviewsData = isAdmin ? results[2].data || [] : []
      const visitsData = isAdmin ? results[3].data || [] : []

      return {
        productsData,
        ordersData,
        reviewsData,
        visitsData
      }
    },
    enabled: !!context,
  })

  const { data: recentProducts } = useQuery({
    queryKey: ['admin-recent-products', context?.storeId],
    queryFn: async () => {
      let q = supabase.from('products').select('*')
      if (context?.storeId) {
        q = q.eq('store_id', context.storeId)
      }
      const { data } = await q.order('created_at', { ascending: false }).limit(5)
      return data || []
    },
    enabled: !!context,
  })

  // Dynamic calculations based on timeframe
  const stats = useMemo(() => {
    if (!rawStats) return null

    const { productsData, ordersData, reviewsData, visitsData } = rawStats

    const now = new Date()
    const limitDate = new Date()
    if (timeframe !== 0) {
      limitDate.setDate(now.getDate() - timeframe)
    }

    const filteredOrders = ordersData.filter((o: any) => {
      if (timeframe === 0) return true
      return new Date(o.created_at) >= limitDate
    })

    const filteredVisits = visitsData.filter((v: any) => {
      if (timeframe === 0) return true
      return new Date(v.created_at) >= limitDate
    })

    const revenue = filteredOrders
      .filter((o: any) => o.status !== 'cancelled')
      .reduce((sum: number, o: any) => sum + (o.total || 0), 0)

    const uniqueVisitors = new Set(filteredVisits.map((v: any) => v.session_id)).size

    // Top products
    const topProductsMap = new Map<string, { title: string, count: number, revenue: number }>()
    filteredOrders.forEach((o: any) => {
      if (o.status !== 'cancelled' && o.items && Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const productTitle = item.product_title || item.title || 'Unknown Product'
          const current = topProductsMap.get(item.product_id) || { title: productTitle, count: 0, revenue: 0 }
          current.count += item.quantity || 1
          current.revenue += (item.price || 0) * (item.quantity || 1)
          topProductsMap.set(item.product_id, current)
        })
      }
    })

    const topProducts = Array.from(topProductsMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Daily revenue grouping
    const revenueByDateMap = new Map<string, number>()
    
    if (timeframe !== 0) {
      for (let i = timeframe - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(now.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        revenueByDateMap.set(dateStr, 0)
      }
    }

    filteredOrders.forEach((o: any) => {
      if (o.status !== 'cancelled') {
        const dateString = new Date(o.created_at).toISOString().split('T')[0]
        if (timeframe === 0 || revenueByDateMap.has(dateString)) {
          revenueByDateMap.set(dateString, (revenueByDateMap.get(dateString) || 0) + o.total)
        }
      }
    })

    const revenueData = Array.from(revenueByDateMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalProducts: productsData.length,
      publishedProducts: productsData.filter((p: any) => p.is_published).length,
      ordersCount: filteredOrders.length,
      reviewsCount: reviewsData.length,
      revenue,
      visitsCount: filteredVisits.length,
      uniqueVisitors,
      revenueData,
      topProducts
    }
  }, [rawStats, timeframe])

  const maxProductRevenue = useMemo(() => {
    if (!stats?.topProducts || stats.topProducts.length === 0) return 0
    return Math.max(...stats.topProducts.map(p => p.revenue))
  }, [stats?.topProducts])

  const quickActions = [
    { label: 'Add Product', desc: 'Create a new product manually', icon: Package, color: 'bg-brand-400', to: '/admin/products/new' },
    { label: 'View Orders', desc: 'Manage customer orders', icon: ShoppingBag, color: 'bg-blue-500', to: '/admin/orders' },
    ...(context?.isAdmin ? [{ label: 'Read Reviews', desc: 'See ratings and site feedback', icon: MessageSquareQuote, color: 'bg-emerald-500', to: '/admin/reviews' }] : []),
    { label: 'Store Settings', desc: 'Name, WhatsApp, colors', icon: Settings, color: 'bg-gray-400', to: '/admin/settings' },
  ]

  const statCards = [
    { label: 'Total Products', value: stats?.totalProducts ?? '—', icon: Package, color: 'bg-brand-400' },
    { label: 'Published', value: stats?.publishedProducts ?? '—', icon: Eye, color: 'bg-green-500' },
    { label: 'Orders', value: stats?.ordersCount ?? '—', icon: ShoppingBag, color: 'bg-blue-500' },
    ...(context?.isAdmin ? [
      { label: 'Reviews', value: stats?.reviewsCount ?? '—', icon: MessageSquareQuote, color: 'bg-emerald-500' },
      { label: 'Revenue', value: stats ? formatPrice(stats.revenue) : '—', icon: TrendingUp, color: 'bg-purple-500' },
      {
        label: 'Visits',
        value: stats ? `${stats.visitsCount.toLocaleString()} · ${stats.uniqueVisitors.toLocaleString()} unique` : '—',
        icon: Users,
        color: 'bg-amber-500',
      },
    ] : [
      { label: 'Revenue', value: stats ? formatPrice(stats.revenue) : '—', icon: TrendingUp, color: 'bg-purple-500' }
    ]),
  ]

  if (context?.approvalStatus === 'pending' && !context?.isAdmin) {
    return (
      <AdminLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
          <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Store size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Store Pending Approval
          </h1>
          <p className="text-gray-600 mb-8 max-w-md">
            Your store application has been submitted and is currently under review. Please contact the administrator to complete your payment and activate your seller dashboard.
          </p>
          <a href={`https://wa.me/${context?.adminWhatsapp}`} target="_blank" rel="noopener noreferrer" className="bg-brand-400 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-500 transition-colors">
            Contact Administrator
          </a>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 pb-28 lg:pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <p className="text-gray-400 text-xs sm:text-sm mb-0.5">Dashboard</p>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Overview</h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                title="Select timeframe"
                value={timeframe}
                onChange={(e) => setTimeframe(Number(e.target.value))}
                className="bg-white border border-gray-200 text-gray-900 text-sm font-semibold rounded-xl pl-10 pr-8 py-2 outline-none focus:border-brand-400 appearance-none cursor-pointer shadow-sm"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
                <option value={0}>All Time</option>
              </select>
              <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <Link
              to="/admin/products/new"
              className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-xs sm:text-sm flex-shrink-0 shadow-sm shadow-brand-400/20"
            >
              <Plus size={14} />
              Add Product
            </Link>
          </div>
        </div>

        {/* Stats */}
        <section className="mb-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2.5 px-1">At a glance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {statCards.map(card => (
              <div
                key={card.label}
                className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 hover:border-brand-400/20 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-2 cursor-default"
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

        {/* Charts & Analytics */}
        <section className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 flex flex-col min-h-[350px]">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-gray-400" />
                <h2 className="font-semibold text-gray-900 text-sm sm:text-base">
                  Revenue ({timeframe === 0 ? 'All Time' : `Last ${timeframe} Days`})
                </h2>
              </div>
              
              <div className="flex items-center rounded-lg bg-gray-100 p-1 border border-gray-200">
                {(['area', 'line', 'bar'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setChartType(type)}
                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all capitalize ${
                      chartType === type
                        ? 'bg-brand-400 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 w-full h-full min-h-[220px]">
              {stats?.revenueData && stats.revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'area' ? (
                    <AreaChart data={stats.revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--brand-400, #d4820a)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--brand-400, #d4820a)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border)" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--admin-text-soft)', fontSize: 11 }} 
                        dy={10}
                        tickFormatter={(val) => {
                          const d = new Date(val)
                          return `${d.getMonth()+1}/${d.getDate()}`
                        }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--admin-text-soft)', fontSize: 11 }} 
                        dx={-10}
                        tickFormatter={(val) => `GH₵${val}`}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid var(--admin-border)',
                          backgroundColor: 'var(--admin-panel-soft)',
                          color: 'var(--admin-text)',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          backdropFilter: 'blur(8px)'
                        }}
                        itemStyle={{ color: 'var(--admin-text)' }}
                        labelStyle={{ color: 'var(--admin-text-muted)' }}
                        formatter={(value: number) => [`GH₵${value.toLocaleString()}`, 'Revenue']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="var(--brand-400, #d4820a)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, fill: 'var(--brand-400, #d4820a)' }} />
                    </AreaChart>
                  ) : chartType === 'bar' ? (
                    <BarChart data={stats.revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border)" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--admin-text-soft)', fontSize: 11 }} 
                        dy={10}
                        tickFormatter={(val) => {
                          const d = new Date(val)
                          return `${d.getMonth()+1}/${d.getDate()}`
                        }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--admin-text-soft)', fontSize: 11 }} 
                        dx={-10}
                        tickFormatter={(val) => `GH₵${val}`}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid var(--admin-border)',
                          backgroundColor: 'var(--admin-panel-soft)',
                          color: 'var(--admin-text)',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          backdropFilter: 'blur(8px)'
                        }}
                        itemStyle={{ color: 'var(--admin-text)' }}
                        labelStyle={{ color: 'var(--admin-text-muted)' }}
                        formatter={(value: number) => [`GH₵${value.toLocaleString()}`, 'Revenue']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Bar dataKey="revenue" fill="var(--brand-400, #d4820a)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  ) : (
                    <LineChart data={stats.revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border)" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--admin-text-soft)', fontSize: 11 }} 
                        dy={10}
                        tickFormatter={(val) => {
                          const d = new Date(val)
                          return `${d.getMonth()+1}/${d.getDate()}`
                        }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--admin-text-soft)', fontSize: 11 }} 
                        dx={-10}
                        tickFormatter={(val) => `GH₵${val}`}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid var(--admin-border)',
                          backgroundColor: 'var(--admin-panel-soft)',
                          color: 'var(--admin-text)',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          backdropFilter: 'blur(8px)'
                        }}
                        itemStyle={{ color: 'var(--admin-text)' }}
                        labelStyle={{ color: 'var(--admin-text-muted)' }}
                        formatter={(value: number) => [`GH₵${value.toLocaleString()}`, 'Revenue']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="var(--brand-400, #d4820a)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: 'var(--brand-400, #d4820a)' }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No revenue data available.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star size={18} className="text-yellow-500" />
                <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Top Selling Products</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {stats?.topProducts && stats.topProducts.length > 0 ? (
                  stats.topProducts.map((p: any, idx: number) => {
                    const pct = maxProductRevenue > 0 ? (p.revenue / maxProductRevenue) * 100 : 0
                    return (
                      <div key={idx} className="py-3 flex flex-col gap-1.5 hover:bg-gray-50/20 transition-all px-1 rounded-lg">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{p.count} sold</p>
                          </div>
                          <p className="text-sm font-bold text-gray-900">{formatPrice(p.revenue)}</p>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${pct}%` }}
                            className="h-full bg-brand-400 transition-all duration-500" 
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-gray-400 text-sm py-4">No sales data available yet.</p>
                )}
              </div>
            </div>
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
