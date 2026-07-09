import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, 
  Eye, 
  Check, 
  X, 
  ClipboardCheck, 
  DollarSign, 
  Store as StoreIcon, 
  Tag, 
  ChevronDown, 
  Edit, 
  Plus 
} from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'
import { toast } from 'sonner'

interface Store {
  id: string
  name: string
  slug: string
  whatsapp_number: string
  business_category: string
  description: string
  instagram_handle: string
  approval_status: 'pending' | 'approved' | 'rejected'
  markup_percentage: number
  created_at: string
  owner_id?: string | null
  owner?: {
    id: string
    email: string
    display_name: string
  } | null
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
  const [markupOverrides, setMarkupOverrides] = useState<Record<string, string>>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Store Form States
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [storeForm, setStoreForm] = useState({
    name: '',
    slug: '',
    owner_id: '',
    whatsapp_number: '',
    business_category: '',
    description: '',
    approval_status: 'approved' as 'pending' | 'approved' | 'rejected',
  })
  
  const qc = useQueryClient()

  // Fetch profiles for owner selection lookup dropdown
  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .order('email')
      if (error) throw error
      return data || []
    }
  })

  // Fetch products that belong to a merchant store
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['admin-approvals', 'products'],
    queryFn: async () => {
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
  const { data: stores, isLoading: storesLoading } = useQuery<Store[]>( {
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
    mutationFn: async ({ id, status, markup }: { id: string; status?: 'pending' | 'approved' | 'rejected', markup?: number }) => {
      const payload: any = {}
      if (status) payload.approval_status = status
      if (markup !== undefined) payload.markup_percentage = markup
      const { error } = await supabase.from('stores').update(payload).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-approvals', 'stores'] })
      setUpdatingId(null)
    }
  })

  // Mutation to save/update stores (Admin Creation / Edit Assignment)
  const saveStoreMutation = useMutation({
    mutationFn: async (payload: typeof storeForm) => {
      const dbPayload = {
        name: payload.name,
        slug: payload.slug,
        owner_id: payload.owner_id || null,
        whatsapp_number: payload.whatsapp_number || null,
        business_category: payload.business_category || null,
        description: payload.description || null,
        approval_status: payload.approval_status,
      }

      if (editingStore) {
        const { error } = await supabase
          .from('stores')
          .update(dbPayload)
          .eq('id', editingStore.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('stores')
          .insert(dbPayload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-approvals', 'stores'] })
      setIsStoreModalOpen(false)
      setEditingStore(null)
      toast.success(editingStore ? 'Store updated successfully!' : 'Store created successfully!')
    },
    onError: (err: any) => {
      toast.error(`Failed to save store: ${err.message}`)
    }
  })

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
  }

  const handleNameChange = (val: string) => {
    setStoreForm(prev => ({
      ...prev,
      name: val,
      slug: editingStore ? prev.slug : slugify(val)
    }))
  }

  const openEditStoreModal = (store: Store) => {
    setEditingStore(store)
    setStoreForm({
      name: store.name || '',
      slug: store.slug || '',
      owner_id: store.owner_id || '',
      whatsapp_number: store.whatsapp_number || '',
      business_category: store.business_category || '',
      description: store.description || '',
      approval_status: store.approval_status || 'approved',
    })
    setIsStoreModalOpen(true)
  }

  const filteredProducts = products?.filter(product => {
    const matchesTab = product.approval_status === activeTab
    const matchesSearch = product.title?.toLowerCase().includes(search.toLowerCase()) || 
                          product.stores?.name?.toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  })

  const enrichedStores = useMemo(() => {
    if (!stores) return []
    return stores.map(store => {
      const owner = profiles?.find((p: any) => p.id === store.owner_id) || null
      return {
        ...store,
        owner
      }
    })
  }, [stores, profiles])

  const filteredStores = enrichedStores?.filter(store => {
    const matchesTab = store.approval_status === activeTab
    const matchesSearch = store.name?.toLowerCase().includes(search.toLowerCase()) || 
                          store.whatsapp_number?.includes(search) ||
                          store.owner?.email?.toLowerCase().includes(search.toLowerCase())
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

  const handleMarkupSave = (store: Store) => {
    const val = markupOverrides[store.id]
    if (val === undefined) return
    setUpdatingId(store.id)
    const markupNum = val === '' ? 0 : parseFloat(val)
    updateStoreApproval.mutate({ id: store.id, markup: markupNum })
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

        {/* Tabs & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 mb-6">
          <div className="flex border-b-0 gap-2">
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

          {activeView === 'stores' && (
            <button
              onClick={() => {
                setEditingStore(null)
                setStoreForm({
                  name: '',
                  slug: '',
                  owner_id: '',
                  whatsapp_number: '',
                  business_category: '',
                  description: '',
                  approval_status: 'approved',
                })
                setIsStoreModalOpen(true)
              }}
              className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-xs sm:text-sm flex-shrink-0 shadow-sm mb-2 sm:mb-0"
            >
              <Plus size={14} />
              Create Store
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={activeView === 'stores' ? "Search stores, numbers, owner emails..." : "Search products or stores..."}
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
                              <StoreIcon size={12} /> {product.stores.name}
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
                <div key={store.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 hover:bg-gray-50/50 transition-colors animate-fade-in">
                  <div className="flex-1">
                    <p className="text-gray-900 text-base font-bold flex items-center gap-2 flex-wrap">
                      {store.name} 
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                        {store.business_category || 'No Category'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        store.owner ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {store.owner ? `Owner: ${store.owner.display_name || 'No Name'}` : 'Unassigned (No Owner)'}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1 max-w-xl">{store.description || 'No description provided.'}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-400">
                      <span>WhatsApp: {store.whatsapp_number || 'N/A'}</span>
                      {store.instagram_handle && <span>IG: @{store.instagram_handle}</span>}
                      <span>Slug: <span className="font-semibold text-gray-600">/{store.slug}</span></span>
                      {store.owner && <span className="text-gray-500">Email: {store.owner.email}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-3 items-end flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        placeholder="Markup %" 
                        className="w-24 border rounded-lg px-2 py-1 text-sm outline-none focus:border-brand-400"
                        value={markupOverrides[store.id] ?? store.markup_percentage ?? ''}
                        onChange={e => setMarkupOverrides({ ...markupOverrides, [store.id]: e.target.value })}
                      />
                      <button 
                        onClick={() => handleMarkupSave(store)}
                        disabled={updatingId === store.id || (markupOverrides[store.id] === undefined)}
                        className="bg-brand-50 hover:bg-brand-100 text-brand-600 px-3 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {updatingId === store.id ? 'Saving...' : 'Set %'}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 justify-end mt-1">
                      <button
                        onClick={() => openEditStoreModal(store)}
                        className="flex items-center gap-1 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <Edit size={14} /> Edit & Assign
                      </button>

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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Store Modal */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden border border-gray-150 shadow-2xl p-6 relative flex flex-col gap-4">
            <button
              onClick={() => {
                setIsStoreModalOpen(false)
                setEditingStore(null)
              }}
              className="absolute right-4 top-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all animate-spin-once"
            >
              <X size={18} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <StoreIcon size={20} className="text-brand-400" />
              {editingStore ? 'Edit Store Credentials' : 'Create & Assign Store'}
            </h2>
            <p className="text-xs text-gray-400 -mt-2">
              {editingStore ? 'Modify store details and merchant ownership.' : 'Deploy a new vendor storefront instantly.'}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveStoreMutation.mutate(storeForm)
              }}
              className="space-y-4 text-left"
            >
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">Store Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pastel Pasture"
                  value={storeForm.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-sm outline-none bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">URL Slug (Auto-generated)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. pastel-pasture"
                  value={storeForm.slug}
                  onChange={(e) => setStoreForm({ ...storeForm, slug: slugify(e.target.value) })}
                  className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-sm outline-none bg-white text-gray-900"
                />
                <p className="text-[10px] text-gray-400 mt-1">URL: {window.location.origin}/s/{storeForm.slug || 'slug'}</p>
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 024XXXXXXX"
                  value={storeForm.whatsapp_number}
                  onChange={(e) => setStoreForm({ ...storeForm, whatsapp_number: e.target.value })}
                  className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-sm outline-none bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">Assign Owner (Merchant Profile)</label>
                <div className="relative">
                  <select
                    title="Select Owner"
                    value={storeForm.owner_id}
                    onChange={(e) => setStoreForm({ ...storeForm, owner_id: e.target.value })}
                    className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-sm outline-none bg-white text-gray-900 appearance-none cursor-pointer pr-10"
                  >
                    <option value="">(Unassigned / Empty Owner)</option>
                    {profiles?.map((profile: any) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.display_name || 'No Name'} ({profile.email})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">Business Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Clothing"
                    value={storeForm.business_category}
                    onChange={(e) => setStoreForm({ ...storeForm, business_category: e.target.value })}
                    className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-sm outline-none bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">Approval Status</label>
                  <div className="relative">
                    <select
                      title="Select status"
                      value={storeForm.approval_status}
                      onChange={(e) => setStoreForm({ ...storeForm, approval_status: e.target.value as any })}
                      className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-sm outline-none bg-white text-gray-900 appearance-none cursor-pointer pr-10"
                    >
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Tell us about the store..."
                  value={storeForm.description}
                  onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                  className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-sm outline-none bg-white text-gray-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsStoreModalOpen(false)
                    setEditingStore(null)
                  }}
                  className="px-4 py-2 border rounded-xl hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveStoreMutation.isPending}
                  className="px-4 py-2 bg-brand-400 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {saveStoreMutation.isPending ? 'Saving...' : editingStore ? 'Update Store' : 'Create Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
