import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, Check, X, ClipboardCheck, DollarSign, Store, Tag } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

interface Store {
  id: string
  name: string
  slug: string
  whatsapp_number: string
  business_category: string
  description: string
  instagram_handle: string
  approval_status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface Product {
  id: string
  title: string
  category: string
  selling_price: number
  images: string[]
  is_published: boolean
  is_featured: boolean
  store_id: string
  approval_status: 'pending' | 'approved' | 'rejected'
  is_approved_for_marketplace: boolean
  marketplace_price: number | null
  stores?: Store | null
}

export default function AdminApprovals() {
  const [activeView, setActiveView] = useState<'products' | 'stores'>('stores')
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [search, setSearch] = useState('')
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  const qc = useQueryClient()

  // Fetch products that belong to a merchant store
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['admin-approvals', 'products'],
    queryFn: async () => {
      // Query joining stores
      const { data, error } = await supabase
        .from('products')
        .select('*, stores:store_id(*)')
        .not('store_id', 'is', null)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return (data as any) || []
    },
  })

  // Fetch stores
  const { data: stores, isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ['admin-approvals', 'stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
  })

  // Mutation to update approval/syndication status & custom price override
  const updateApproval = useMutation({
    mutationFn: async ({
      id,
      status,
      approvedForMarketplace,
      overridePrice,
    }: {
      id: string
      status: 'pending' | 'approved' | 'rejected'
      approvedForMarketplace?: boolean
      overridePrice?: number | null
    }) => {
      const payload: Partial<Product> = {
        approval_status: status,
      }
      
      if (approvedForMarketplace !== undefined) {
        payload.is_approved_for_marketplace = approvedForMarketplace
      }
      if (overridePrice !== undefined) {
        payload.marketplace_price = overridePrice
      }

      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-approvals', 'products'] })
      setUpdatingId(null)
    },
  })

  // Mutation to update store approval status
  const updateStoreApproval = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pending' | 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('stores').update({ approval_status: status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-approvals', 'stores'] })
    }
  })

  const filteredProducts = products?.filter(product => {
    const matchesTab = product.approval_status === activeTab
    const matchesSearch = product.title?.toLowerCase().includes(search.toLowerCase()) || 
                          product.stores?.name?.toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  })

  const filteredStores = stores?.filter(store => {
    const matchesTab = store.approval_status === activeTab
    const matchesSearch = store.name?.toLowerCase().includes(search.toLowerCase()) || 
                          store.whatsapp_number?.includes(search)
    return matchesTab && matchesSearch
  })

  const handlePriceSave = (product: Product) => {
    const overrideVal = priceOverrides[product.id]
    if (overrideVal === undefined) return
    
    setUpdatingId(product.id)
    const priceNum = overrideVal === '' ? null : parseFloat(overrideVal)
    
    updateApproval.mutate({
      id: product.id,
      status: product.approval_status,
      overridePrice: priceNum,
    })
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gray-400 text-sm mb-1">Marketplace Controls</p>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck size={24} className="text-brand-400" /> Approvals
            </h1>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => { setActiveView('stores'); setSearch(''); setActiveTab('pending') }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeView === 'stores' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Stores
            </button>
            <button
              onClick={() => { setActiveView('products'); setSearch(''); setActiveTab('pending') }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeView === 'products' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Products
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 mb-6 gap-2">
          {(['pending', 'approved', 'rejected'] as const).map(tab => {
            const count = activeView === 'stores' 
              ? (stores || []).filter(s => s.approval_status === tab).length
              : (products || []).filter(p => p.approval_status === tab).length

            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab)
                  setSearch('')
                }}
                className={`pb-3 px-4 font-semibold text-sm capitalize transition-all border-b-2 -mb-[2px] ${
                  activeTab === tab
                    ? 'border-brand-400 text-brand-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab} ({count})
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products or stores..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 focus:border-brand-400 rounded-xl pl-9 pr-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none bg-white text-sm"
          />
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {(activeView === 'products' ? productsLoading : storesLoading) ? (
            <div className="p-8 text-center text-gray-400">Loading approvals list...</div>
          ) : (activeView === 'products' ? filteredProducts : filteredStores)?.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              No items found in this tab.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activeView === 'products' && filteredProducts?.map(product => {
                const currentOverride = priceOverrides[product.id] ?? (product.marketplace_price?.toString() || '')
                const isPriceDirty = currentOverride !== (product.marketplace_price?.toString() || '')
                
                return (
                  <div key={product.id} className="flex flex-col lg:flex-row lg:items-center gap-4 p-5 hover:bg-gray-50/50 transition-colors">
                    {/* Product Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <img
                        src={product.images?.[0] || 'https://placehold.co/48x48/f3f4f6/9ca3af?text=?'}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                      />
                      <div className="min-w-0">
                        <p className="text-gray-900 text-sm font-semibold truncate">{product.title}</p>
                        <p className="text-gray-400 text-xs mb-1">{product.category}</p>
                        
                        <div className="flex flex-wrap gap-2 items-center text-xs">
                          {product.stores && (
                            <span className="flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              <Store size={12} /> {product.stores.name}
                            </span>
                          )}
                          <span className="text-gray-700 bg-amber-50 text-amber-800 font-medium px-2 py-0.5 rounded">
                            Original: {formatPrice(product.selling_price)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions and Custom Pricing */}
                    <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                      {/* Marketplace Pricing Override */}
                      {product.approval_status === 'approved' && (
                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                          <span className="text-xs font-semibold text-gray-500 pl-1.5 flex items-center gap-1">
                            <Tag size={12} /> Market Price:
                          </span>
                          <div className="relative w-28">
                            <DollarSign size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Original"
                              value={currentOverride}
                              onChange={e => setPriceOverrides(prev => ({ ...prev, [product.id]: e.target.value }))}
                              className="w-full pl-6 pr-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none"
                            />
                          </div>
                          {isPriceDirty && (
                            <button
                              onClick={() => handlePriceSave(product)}
                              disabled={updatingId === product.id}
                              className="bg-brand-400 text-white text-[11px] font-bold px-2 py-1 rounded hover:bg-brand-500 transition-colors"
                            >
                              Save
                            </button>
                          )}
                        </div>
                      )}

                      {/* Main Approval Controls */}
                      <div className="flex items-center gap-2">
                        {product.approval_status !== 'approved' && (
                          <button
                            onClick={() => updateApproval.mutate({ id: product.id, status: 'approved', approvedForMarketplace: true })}
                            className="flex items-center gap-1 bg-green-50 text-green-600 hover:bg-green-100 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                          >
                            <Check size={14} /> Approve & Syndicate
                          </button>
                        )}
                        {product.approval_status === 'approved' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateApproval.mutate({ 
                                id: product.id, 
                                status: 'approved', 
                                approvedForMarketplace: !product.is_approved_for_marketplace 
                              })}
                              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                product.is_approved_for_marketplace
                                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <Eye size={14} /> {product.is_approved_for_marketplace ? 'Syndicated' : 'Syndicate to Main'}
                            </button>
                          </div>
                        )}
                        {product.approval_status !== 'rejected' && (
                          <button
                            onClick={() => updateApproval.mutate({ id: product.id, status: 'rejected', approvedForMarketplace: false })}
                            className="flex items-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                          >
                            <X size={14} /> Reject
                          </button>
                        )}
                        {product.approval_status === 'rejected' && (
                          <button
                            onClick={() => updateApproval.mutate({ id: product.id, status: 'pending' })}
                            className="flex items-center gap-1 bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                          >
                            Reset Status
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {activeView === 'stores' && filteredStores?.map(store => (
                <div key={store.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1">
                    <p className="text-gray-900 text-base font-bold flex items-center gap-2">
                      {store.name} 
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                        {store.business_category || 'No Category'}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1 max-w-xl">{store.description || 'No description provided.'}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      <span>WhatsApp: {store.whatsapp_number}</span>
                      {store.instagram_handle && <span>IG: @{store.instagram_handle}</span>}
                      <span>Slug: /{store.slug}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {store.approval_status !== 'approved' && (
                      <button
                        onClick={() => updateStoreApproval.mutate({ id: store.id, status: 'approved' })}
                        className="flex items-center gap-1 bg-green-50 text-green-600 hover:bg-green-100 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <Check size={14} /> Approve Store
                      </button>
                    )}
                    {store.approval_status !== 'rejected' && (
                      <button
                        onClick={() => updateStoreApproval.mutate({ id: store.id, status: 'rejected' })}
                        className="flex items-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <X size={14} /> Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
