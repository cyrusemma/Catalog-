import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ShoppingBag, 
  Download, 
  CaretDown, 
  MagnifyingGlass, 
  Calendar, 
  WhatsappLogo, 
  TrendUp, 
  Clock, 
  Timer, 
  CheckCircle 
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'
import type { Order } from '../../types'

import { useAdminContext } from '../../hooks/useAdminContext'

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30',
  confirmed: 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30',
  processing: 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/30',
  shipped: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30',
  delivered: 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/30',
  cancelled: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30',
}

const BORDER_COLORS: Record<string, string> = {
  pending: 'border-l-amber-500 dark:border-l-amber-500',
  confirmed: 'border-l-blue-500 dark:border-l-blue-500',
  processing: 'border-l-purple-500 dark:border-l-purple-500',
  shipped: 'border-l-indigo-500 dark:border-l-indigo-500',
  delivered: 'border-l-green-500 dark:border-l-green-500',
  cancelled: 'border-l-red-500 dark:border-l-red-500',
}

export default function AdminOrders() {
  const [filter, setFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<number>(30)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})
  
  const qc = useQueryClient()
  const { data: context } = useAdminContext()

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders', context?.storeId, context?.isAdmin],
    queryFn: async () => {
      let query = supabase.from('orders').select('*')
      if (context && !context.isAdmin && context.storeId) {
        query = query.eq('store_id', context.storeId)
      }
      const { data } = await query.order('created_at', { ascending: false })
      return (data || []) as Order[]
    },
    enabled: !!context,
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      toast.success(`Order status updated to ${variables.status}`)
    },
    onError: (err: any) => {
      toast.error(`Failed to update status: ${err.message}`)
    }
  })

  const dateFiltered = orders?.filter(o => {
    if (dateFilter !== 0) {
      const dateLimit = new Date()
      dateLimit.setDate(dateLimit.getDate() - dateFilter)
      if (new Date(o.created_at) < dateLimit) return false
    }
    return true
  }) || []

  const filtered = dateFiltered.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false
    
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      const matchesName = o.customer_name?.toLowerCase().includes(q)
      const matchesPhone = o.customer_phone?.toLowerCase().includes(q)
      const matchesId = o.id.toLowerCase().includes(q)
      const matchesAddress = o.customer_address?.toLowerCase().includes(q)
      if (!matchesName && !matchesPhone && !matchesId && !matchesAddress) return false
    }
    
    return true
  })

  const statusCounts = dateFiltered.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalRevenue = dateFiltered
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0)

  const pendingCount = dateFiltered.filter(o => o.status === 'pending').length
  const activeCount = dateFiltered.filter(o => o.status === 'confirmed' || o.status === 'processing' || o.status === 'shipped').length
  const completedCount = dateFiltered.filter(o => o.status === 'delivered').length

  const exportToCSV = () => {
    if (!filtered?.length) return
    const headers = ['Order ID', 'Date', 'Status', 'Customer Name', 'Phone', 'Address', 'Total']
    const rows = filtered.map(o => [
      o.id,
      new Date(o.created_at).toLocaleString(),
      o.status,
      `"${o.customer_name?.replace(/'/g, "''").replace(/"/g, '""') || ''}"`,
      `"${o.customer_phone?.replace(/'/g, "''").replace(/"/g, '""') || ''}"`,
      `"${o.customer_address?.replace(/'/g, "''").replace(/"/g, '""') || ''}"`,
      o.total
    ])
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Orders exported successfully!')
  }

  const handleSendWhatsAppStatus = (order: Order) => {
    if (!order.customer_phone) {
      toast.error('No phone number provided for this customer')
      return
    }
    const orderId = order.id.slice(0, 8)
    const name = order.customer_name
    let statusText = ''
    switch (order.status) {
      case 'confirmed':
        statusText = `Hi ${name}! 🌟 Your order #${orderId} has been confirmed and is now being prepared.`
        break
      case 'processing':
        statusText = `Hi ${name}! 🛠️ Your order #${orderId} is being processed and will be ready for dispatch soon.`
        break
      case 'shipped':
        statusText = `Hi ${name}! 🚚 Exciting news! Your order #${orderId} has been shipped and is on its way to you.`
        break
      case 'delivered':
        statusText = `Hi ${name}! 🎉 Your order #${orderId} has been delivered. Thank you for shopping with us, we hope you love your items!`
        break
      case 'cancelled':
        statusText = `Hi ${name}! We would like to inform you that your order #${orderId} has been cancelled. Please let us know if you have any questions.`
        break
      default:
        statusText = `Hi ${name}! This is an update regarding your order #${orderId}. Current status: ${order.status}.`
        break
    }
    const cleanPhone = order.customer_phone.replace(/\D/g, '')
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(statusText)}`
    window.open(url, '_blank')
    toast.success('Opening WhatsApp update...')
  }

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }))
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-dark-800/40 dark:text-white/40 text-sm font-bold uppercase tracking-wider mb-1">Store Management</p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-dark-800 dark:text-white">Orders</h1>
          </div>
        </div>

        {/* KPI Cards */}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-dark-800 p-5 rounded-2xl border border-cream-200 dark:border-brand-400/15 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-dark-800/40 dark:text-white/40 uppercase tracking-wider">Total Sales</span>
                <span className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                  <TrendUp size={16} weight="bold" />
                </span>
              </div>
              <p className="text-2xl font-bold text-dark-800 dark:text-white">{formatPrice(totalRevenue)}</p>
              <p className="text-[10px] text-dark-800/40 dark:text-white/40 mt-1">Excludes cancelled orders</p>
            </div>

            <div className="bg-white dark:bg-dark-800 p-5 rounded-2xl border border-cream-200 dark:border-brand-400/15 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-dark-800/40 dark:text-white/40 uppercase tracking-wider">Pending Action</span>
                <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Clock size={16} weight="fill" />
                </span>
              </div>
              <p className="text-2xl font-bold text-dark-800 dark:text-white">{pendingCount}</p>
              <p className="text-[10px] text-dark-800/40 dark:text-white/40 mt-1">Awaiting confirmation</p>
            </div>

            <div className="bg-white dark:bg-dark-800 p-5 rounded-2xl border border-cream-200 dark:border-brand-400/15 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-dark-800/40 dark:text-white/40 uppercase tracking-wider">In Preparation</span>
                <span className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Timer size={16} weight="fill" />
                </span>
              </div>
              <p className="text-2xl font-bold text-dark-800 dark:text-white">{activeCount}</p>
              <p className="text-[10px] text-dark-800/40 dark:text-white/40 mt-1">Confirmed / Prep / Shipped</p>
            </div>

            <div className="bg-white dark:bg-dark-800 p-5 rounded-2xl border border-cream-200 dark:border-brand-400/15 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-dark-800/40 dark:text-white/40 uppercase tracking-wider">Completed</span>
                <span className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                  <CheckCircle size={16} weight="fill" />
                </span>
              </div>
              <p className="text-2xl font-bold text-dark-800 dark:text-white">{completedCount}</p>
              <p className="text-[10px] text-dark-800/40 dark:text-white/40 mt-1">Delivered to customers</p>
            </div>
          </div>
        )}

        {/* Filter & Search Controls */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search orders by customer name, phone, ID..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-200 dark:border-brand-400/15 bg-white dark:bg-dark-800 text-dark-800 dark:text-white text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 shadow-sm transition-all"
              />
              <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-800/40 dark:text-white/40 pointer-events-none" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  title="Filter by date range"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(Number(e.target.value))}
                  className="bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 text-dark-800 dark:text-white text-sm font-semibold rounded-xl pl-10 pr-8 py-2.5 outline-none focus:border-brand-400 appearance-none cursor-pointer shadow-sm"
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>Last 90 Days</option>
                  <option value={0}>All Time</option>
                </select>
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-800/40 dark:text-white/40 pointer-events-none" />
                <CaretDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-800/40 dark:text-white/40 pointer-events-none" />
              </div>
              
              <button
                onClick={exportToCSV}
                disabled={!filtered?.length}
                className="flex items-center gap-1.5 bg-cream-100 dark:bg-white/5 hover:bg-cream-200 dark:hover:bg-white/10 text-dark-800 dark:text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-transparent dark:border-white/5 shadow-sm"
              >
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2.5 hide-scrollbar select-none border-b border-cream-200/50 dark:border-white/5">
            {[
              { id: 'all', label: 'All Orders', count: dateFiltered.length },
              { id: 'pending', label: 'Pending', count: statusCounts.pending || 0 },
              { id: 'confirmed', label: 'Confirmed', count: statusCounts.confirmed || 0 },
              { id: 'processing', label: 'Processing', count: statusCounts.processing || 0 },
              { id: 'shipped', label: 'Shipped', count: statusCounts.shipped || 0 },
              { id: 'delivered', label: 'Delivered', count: statusCounts.delivered || 0 },
              { id: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled || 0 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border ${
                  filter === tab.id 
                    ? 'bg-brand-400 border-brand-400 text-white shadow-sm shadow-brand-400/20' 
                    : 'bg-white dark:bg-dark-800 text-dark-800/60 dark:text-white/60 border-cream-200 dark:border-brand-400/15 hover:border-brand-400/40'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                  filter === tab.id 
                    ? 'bg-white/20 text-white' 
                    : 'bg-cream-100 dark:bg-white/5 text-dark-800/50 dark:text-white/40'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-dark-800/40 dark:text-white/40 font-medium">Loading orders...</div>
        ) : !filtered?.length ? (
          <div className="bg-white dark:bg-dark-800 rounded-3xl border border-cream-200 dark:border-brand-400/15 py-20 text-center shadow-sm">
            <ShoppingBag size={48} className="text-brand-400/50 mx-auto mb-4" />
            <p className="text-dark-800/50 dark:text-white/50 font-semibold">No orders found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(order => {
              const maxVisibleItems = 2
              const hasMoreItems = (order.items?.length || 0) > maxVisibleItems
              const isExpanded = !!expandedOrders[order.id]
              const visibleItems = isExpanded ? (order.items || []) : (order.items || []).slice(0, maxVisibleItems)

              return (
                <div key={order.id} className={`bg-white dark:bg-dark-800 rounded-3xl border border-cream-200 dark:border-brand-400/15 p-5 sm:p-6 shadow-sm border-l-4 ${BORDER_COLORS[order.status]} flex flex-col lg:flex-row gap-6 hover:shadow-md transition-all duration-200`}>
                  
                  {/* Left side: Order Info & Items */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                      <span className="font-mono font-bold text-dark-800 dark:text-white text-lg">#{order.id.slice(-6).toUpperCase()}</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-lg border uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                        {order.status}
                      </span>
                      <span className="text-dark-800/40 dark:text-white/40 font-medium text-sm ml-auto">
                        {new Date(order.created_at).toLocaleString('en-GH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2 mb-5">
                      {visibleItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-cream-50 dark:bg-dark-700/50 p-2.5 rounded-2xl border border-cream-100 dark:border-white/5">
                          <img src={item.product_image || 'https://placehold.co/100x100/f3f4f6/9ca3af?text=?'} alt="" className="w-12 h-12 rounded-xl object-cover bg-white dark:bg-dark-800 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-dark-800 dark:text-white text-sm font-semibold truncate">{item.product_title}</p>
                            <p className="text-brand-400 text-xs font-bold mt-0.5">{formatPrice(item.price)} <span className="text-dark-800/40 dark:text-white/40 font-medium ml-1">x {item.quantity}</span></p>
                          </div>
                          <div className="text-right pl-2">
                            <span className="text-dark-800 dark:text-white text-sm font-bold">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        </div>
                      ))}
                      
                      {hasMoreItems && (
                        <button
                          type="button"
                          onClick={() => toggleOrderExpanded(order.id)}
                          className="text-xs font-semibold text-brand-400 hover:text-brand-500 transition-colors flex items-center gap-1 mt-1 pl-1 cursor-pointer"
                        >
                          {isExpanded ? 'Show less' : `Show ${order.items.length - maxVisibleItems} more items...`}
                        </button>
                      )}
                    </div>

                    {/* Customer Info */}
                    <div className="bg-cream-100/50 dark:bg-white/5 rounded-2xl p-4 text-sm border border-cream-200 dark:border-white/10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/40 mb-1">Customer</p>
                          <p className="font-semibold text-dark-800 dark:text-white">{order.customer_name}</p>
                          <p className="text-dark-800/60 dark:text-white/60 font-medium">{order.customer_phone}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/40 mb-1">Delivery Address</p>
                          <p className="text-dark-800/60 dark:text-white/60 font-medium leading-relaxed">{order.customer_address || 'No address provided'}</p>
                        </div>
                      </div>
                      {order.notes && (
                        <div className="mt-3 pt-3 border-t border-cream-200 dark:border-white/10">
                          <p className="text-xs font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/40 mb-1">Order Notes</p>
                          <p className="text-dark-800/80 dark:text-white/80 italic">"{order.notes}"</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side: Financials & Actions */}
                  <div className="w-full lg:w-72 flex flex-col">
                    <div className="bg-cream-50 dark:bg-dark-700/30 rounded-2xl p-5 border border-cream-200 dark:border-brand-400/15 flex-1">
                      <h3 className="text-dark-800 dark:text-white font-bold mb-4 flex items-center gap-2">
                        <ShoppingBag size={18} className="text-brand-400" /> 
                        Order Summary
                      </h3>
                      
                      <div className="space-y-2.5 mb-4 text-sm">
                        <div className="flex justify-between text-dark-800/60 dark:text-white/60 font-medium">
                          <span>Subtotal</span>
                          <span>{formatPrice(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-dark-800/60 dark:text-white/60 font-medium">
                          <span>Delivery Fee</span>
                          <span>{formatPrice(order.delivery_fee)}</span>
                        </div>
                        {order.discount_amount > 0 && (
                          <div className="flex justify-between text-green-500 font-medium">
                            <span>Discount</span>
                            <span>-{formatPrice(order.discount_amount)}</span>
                          </div>
                        )}
                        <div className="pt-2.5 mt-2.5 border-t border-cream-200 dark:border-white/10 flex justify-between items-center">
                          <span className="font-bold text-dark-800 dark:text-white">Total</span>
                          <span className="text-lg font-bold text-brand-400">{formatPrice(order.total)}</span>
                        </div>
                      </div>

                      <div className="mt-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/40 mb-2">
                          Update Status
                        </label>
                        <div className="relative">
                          <select
                            title="Order Status"
                            value={order.status}
                            onChange={e => updateStatus.mutate({ id: order.id, status: e.target.value })}
                            className="w-full appearance-none bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 text-dark-800 dark:text-white text-sm font-bold rounded-xl pl-4 pr-10 py-3 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 cursor-pointer shadow-sm transition-all"
                          >
                            {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                          </select>
                          <CaretDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-800/40 dark:text-white/40 pointer-events-none" />
                        </div>
                        {order.customer_phone && (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppStatus(order)}
                            className="w-full mt-3 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                          >
                            <WhatsappLogo size={16} weight="fill" /> Send Status Update
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
