import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Download, 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  RefreshCw 
} from 'lucide-react'
import { toast } from 'sonner'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { useAdminContext } from '../../hooks/useAdminContext'
import { formatPrice } from '../../lib/utils'
import { restockProduct } from '../../lib/inventory'
import type { Product, ProductVariant } from '../../types'

export default function AdminInventory() {
  const qc = useQueryClient()
  const { data: context } = useAdminContext()
  const [filter, setFilter] = useState<'all' | 'out_of_stock' | 'low_stock' | 'in_stock'>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [customStockValue, setCustomStockValue] = useState<string>('')

  // Fetch all products for inventory management
  const { data: products, isLoading, isFetching } = useQuery({
    queryKey: ['admin-inventory', context?.storeId],
    queryFn: async () => {
      let query = supabase.from('products').select('*')
      if (context?.storeId) {
        query = query.eq('store_id', context.storeId)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as Product[]
    },
    enabled: !!context,
  })

  // Restock Mutation
  const restockMutation = useMutation({
    mutationFn: async ({ product, addUnits, exactStock, variantId }: { product: Product; addUnits: number; exactStock?: number; variantId?: string }) => {
      const ok = await restockProduct(product, addUnits, { exactStock, variantId })
      if (!ok) throw new Error('Failed to update stock')
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-inventory'] })
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      setEditingStockId(null)
      toast.success(
        vars.exactStock !== undefined
          ? `Stock set to ${vars.exactStock} units`
          : `Added +${vars.addUnits} units to inventory!`
      )
    },
    onError: (err: any) => {
      toast.error(err.message || 'Restock failed')
    }
  })

  // Inventory Statistics
  const stats = useMemo(() => {
    if (!products) return { totalUnits: 0, totalValue: 0, outOfStockCount: 0, lowStockCount: 0, healthyCount: 0 }
    
    let totalUnits = 0
    let totalValue = 0
    let outOfStockCount = 0
    let lowStockCount = 0
    let healthyCount = 0

    for (const p of products) {
      const units = typeof p.stock === 'number' ? p.stock : 0
      const price = typeof p.selling_price === 'number' ? p.selling_price : 0
      totalUnits += units
      totalValue += units * price

      if (units <= 0 || p.stock_status === 'out_of_stock') {
        outOfStockCount++
      } else if (units <= 3 || p.stock_status === 'few_units_left') {
        lowStockCount++
      } else {
        healthyCount++
      }
    }

    return { totalUnits, totalValue, outOfStockCount, lowStockCount, healthyCount }
  }, [products])

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (!products) return []

    return products.filter(p => {
      const stock = typeof p.stock === 'number' ? p.stock : 0
      
      if (filter === 'out_of_stock' && (stock > 0 && p.stock_status !== 'out_of_stock')) return false
      if (filter === 'low_stock' && (stock > 3 || stock <= 0 || p.stock_status === 'out_of_stock')) return false
      if (filter === 'in_stock' && (stock <= 3 || p.stock_status === 'out_of_stock')) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesTitle = p.title.toLowerCase().includes(q)
        const matchesBrand = p.brand?.toLowerCase().includes(q)
        const matchesCat = p.category?.toLowerCase().includes(q)
        if (!matchesTitle && !matchesBrand && !matchesCat) return false
      }

      return true
    })
  }, [products, filter, search])

  // CSV Export
  const exportInventoryCSV = () => {
    if (!products || products.length === 0) return

    const headers = ['Product ID', 'Title', 'Brand', 'Category', 'Selling Price (GHS)', 'Stock Units', 'Stock Status', 'Variant Options', 'Total Value (GHS)']
    const rows = products.map(p => {
      const units = p.stock || 0
      const price = p.selling_price || 0
      const val = (units * price).toFixed(2)
      const variantsText = (p.variants || []).map(v => `${v.name} (${v.stock ?? units} left)`).join('; ')
      return [
        `"${p.id}"`,
        `"${p.title.replace(/"/g, '""')}"`,
        `"${p.brand || ''}"`,
        `"${p.category || ''}"`,
        price.toFixed(2),
        units,
        p.stock_status,
        `"${variantsText}"`,
        val,
      ]
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `inventory_report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
              <Package size={28} className="text-brand-500" />
              Real-Time Inventory Hub
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Live stock monitoring, instant restock actions, and automated low-stock warnings.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['admin-inventory'] })}
              disabled={isFetching}
              className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-xs"
              title="Refresh inventory"
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin text-brand-500' : ''} />
            </button>
            <button
              onClick={exportInventoryCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs"
            >
              <Download size={16} /> Export Inventory
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Out of Stock Alert */}
          <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">Out of Stock</span>
              <XCircle size={20} className="text-red-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-red-700 mt-2">{stats.outOfStockCount}</p>
            <p className="text-[11px] text-red-500 mt-1 font-medium">Needs immediate restock</p>
          </div>

          {/* Low Stock Alert */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">About to Finish</span>
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-2">{stats.lowStockCount}</p>
            <p className="text-[11px] text-amber-600 mt-1 font-medium">≤ 3 units remaining</p>
          </div>

          {/* Total Units */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Units</span>
              <Package size={20} className="text-brand-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">{stats.totalUnits}</p>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">Across {products?.length || 0} products</p>
          </div>

          {/* Total Inventory Value */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Inventory Value</span>
              <DollarSign size={20} className="text-emerald-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">{formatPrice(stats.totalValue)}</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">Total retail valuation</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Items', count: products?.length || 0 },
                { id: 'out_of_stock', label: '🔴 Out of Stock', count: stats.outOfStockCount },
                { id: 'low_stock', label: '🟡 Low Stock', count: stats.lowStockCount },
                { id: 'in_stock', label: '🟢 In Stock', count: stats.healthyCount },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                    filter === tab.id
                      ? 'bg-brand-500 border-brand-500 text-white shadow-xs'
                      : 'bg-gray-50 text-gray-600 border-gray-200/60 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${filter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200/70 text-gray-600'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search inventory..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-brand-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Product Inventory Table / Cards */}
        {isLoading ? (
          <div className="text-center py-20 text-gray-400 font-medium">Loading inventory...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 py-16 text-center shadow-xs">
            <Package size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-bold text-base">No matching products found</p>
            <p className="text-gray-400 text-xs mt-1">Try switching tabs or adjusting your search.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map(product => {
              const currentStock = typeof product.stock === 'number' ? product.stock : 0
              const isOut = currentStock <= 0 || product.stock_status === 'out_of_stock'
              const isLow = currentStock > 0 && currentStock <= 3
              const hasVariants = product.variants && product.variants.length > 0
              const isExpanded = expandedId === product.id

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                    isOut ? 'border-red-200 bg-red-50/10' : isLow ? 'border-amber-200 bg-amber-50/10' : 'border-gray-100'
                  }`}
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Product Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={product.images?.[0] || 'https://placehold.co/80x80/f3f4f6/9ca3af?text=?'}
                        alt={product.title}
                        className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0 bg-gray-50"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-gray-900 truncate">
                            {product.title}
                          </h3>
                          {hasVariants && (
                            <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 border border-brand-200/50 px-2 py-0.2 rounded-md">
                              {product.variants!.length} Variations
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {product.category || 'General'} · <span className="font-semibold text-gray-700">{formatPrice(product.selling_price)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Stock Status & Quick Actions */}
                    <div className="flex items-center flex-wrap sm:flex-nowrap gap-3">
                      {/* Status Badge */}
                      <div className="text-right flex flex-col items-end min-w-[100px]">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 ${
                            isOut
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : isLow
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isOut ? (
                            <><XCircle size={12} weight="bold" /> Out of Stock</>
                          ) : isLow ? (
                            <><AlertTriangle size={12} /> {currentStock} left</>
                          ) : (
                            <><CheckCircle size={12} /> {currentStock} units</>
                          )}
                        </span>
                      </div>

                      {/* Quick Restock Buttons (+5, +10, +25) */}
                      <div className="flex items-center gap-1">
                        {[5, 10, 25].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => restockMutation.mutate({ product, addUnits: amt })}
                            disabled={restockMutation.isPending}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-gray-200 text-gray-700 transition-colors shadow-2xs"
                            title={`Add +${amt} units`}
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>

                      {/* Custom Stock Input Toggle */}
                      {editingStockId === product.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={customStockValue}
                            onChange={e => setCustomStockValue(e.target.value)}
                            placeholder={currentStock.toString()}
                            className="w-16 px-2 py-1 text-xs border border-brand-500 rounded-lg outline-none font-bold text-center"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const num = parseInt(customStockValue, 10)
                              if (!Number.isNaN(num) && num >= 0) {
                                restockMutation.mutate({ product, addUnits: 0, exactStock: num })
                              }
                            }}
                            className="p-1 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStockId(product.id)
                            setCustomStockValue(currentStock.toString())
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                        >
                          Set
                        </button>
                      )}

                      {/* Expand Variants Toggle */}
                      {hasVariants && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : product.id)}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                          title="Show variation stock"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Variations Breakdown */}
                  {hasVariants && isExpanded && (
                    <div className="bg-gray-50/80 border-t border-gray-100 p-4 space-y-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                        Priced Variations Stock Breakdown
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {product.variants!.map(v => {
                          const vStock = typeof v.stock === 'number' ? v.stock : currentStock
                          const isVOut = vStock <= 0
                          const isVLow = vStock > 0 && vStock <= 3
                          return (
                            <div
                              key={v.id}
                              className="p-3 bg-white rounded-xl border border-gray-200/80 flex items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-800 truncate">{v.name}</p>
                                <p className="text-[11px] text-gray-500">{formatPrice(v.price)}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                    isVOut
                                      ? 'bg-red-50 text-red-600'
                                      : isVLow
                                      ? 'bg-amber-50 text-amber-600'
                                      : 'bg-emerald-50 text-emerald-600'
                                  }`}
                                >
                                  {vStock} units
                                </span>
                                <button
                                  type="button"
                                  onClick={() => restockMutation.mutate({ product, addUnits: 5, variantId: v.id })}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 hover:bg-brand-50 hover:text-brand-600 border border-gray-200 transition-colors"
                                  title="Add +5 to this variant"
                                >
                                  +5
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
