import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag, ChevronDown, Download } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'
import type { Order } from '../../types'

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-purple-50 text-purple-700 border-purple-200',
  shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

export default function AdminOrders() {
  const [filter, setFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<number>(30)
  const qc = useQueryClient()

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
      return (data || []) as Order[]
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from('orders').update({ status }).eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  })

  const filtered = orders?.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false
    
    if (dateFilter !== 0) {
      const dateLimit = new Date()
      dateLimit.setDate(dateLimit.getDate() - dateFilter)
      if (new Date(o.created_at) < dateLimit) return false
    }
    
    return true
  })

  const exportToCSV = () => {
    if (!filtered?.length) return
    const headers = ['Order ID', 'Date', 'Status', 'Customer Name', 'Phone', 'Address', 'Total']
    const rows = filtered.map(o => [
      o.id,
      new Date(o.created_at).toLocaleString(),
      o.status,
      `"${o.customer_name?.replace(/"/g, '""') || ''}"`,
      `"${o.customer_phone?.replace(/"/g, '""') || ''}"`,
      `"${o.customer_address?.replace(/"/g, '""') || ''}"`,
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
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <p className="text-gray-400 text-sm mb-1">Orders</p>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {['all', ...STATUSES].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                  filter === s ? 'bg-brand-400 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-400/40'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(Number(e.target.value))}
              className="bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl px-3 py-1.5 outline-none focus:border-brand-400"
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={0}>All Time</option>
            </select>
            
            <button
              onClick={exportToCSV}
              disabled={!filtered?.length}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Loading orders...</div>
        ) : !filtered?.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
            <ShoppingBag size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-sm">#{order.id.slice(-6).toUpperCase()}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[order.status]}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs">{new Date(order.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatPrice(order.total)}</p>
                    <p className="text-gray-400 text-xs">{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Customer */}
                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                  <p className="font-medium text-gray-900">{order.customer_name}</p>
                  <p className="text-gray-500">{order.customer_phone}</p>
                  <p className="text-gray-500">{order.customer_address}</p>
                  {order.notes && <p className="text-gray-500 mt-1 italic">"{order.notes}"</p>}
                </div>

                {/* Items */}
                <div className="space-y-2 mb-4">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <img src={item.product_image || 'https://placehold.co/32x32/f3f4f6/9ca3af?text=?'} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      <span className="flex-1 text-gray-700 text-sm truncate">{item.product_title}</span>
                      <span className="text-gray-500 text-xs">x{item.quantity}</span>
                      <span className="text-gray-900 text-sm font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Status updater */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">Update status:</span>
                  <div className="relative">
                    <select
                      value={order.status}
                      onChange={e => updateStatus.mutate({ id: order.id, status: e.target.value })}
                      className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-xl pl-3 pr-7 py-1.5 outline-none focus:border-brand-400 cursor-pointer"
                    >
                      {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
