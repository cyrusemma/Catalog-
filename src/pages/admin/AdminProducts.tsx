import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminContext } from '../../hooks/useAdminContext'
import { Plus, Search, Star, Eye, EyeOff, Pencil, Trash2, Copy, Zap, X, Check, ArrowDownUp } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

export default function AdminProducts() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
    }, 200)
    return () => clearTimeout(timer)
  }, [searchInput])

  const [sortBy, setSortBy] = useState('newest')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [quickEditId, setQuickEditId] = useState<string | null>(null)
  const [quickEditPrice, setQuickEditPrice] = useState<string>('')
  const [quickEditStock, setQuickEditStock] = useState<string>('')
  const qc = useQueryClient()

  const { data: context } = useAdminContext()

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products', context?.storeId],
    queryFn: async () => {
      let query = supabase.from('products').select('*')
      if (context?.storeId) {
        query = query.eq('store_id', context.storeId)
      }
      const { data } = await query.order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!context,
  })

  const togglePublish = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      await supabase.from('products').update({ is_published: val }).eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  })

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      await supabase.from('products').update({ is_featured: val }).eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  })

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('products').delete().eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  })

  const quickEditProduct = useMutation({
    mutationFn: async ({ id, selling_price, stock }: { id: string; selling_price: number; stock: number }) => {
      await supabase.from('products').update({ selling_price, stock }).eq('id', id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      setQuickEditId(null)
    },
  })

  // Bulk Operations
  const bulkTogglePublish = useMutation({
    mutationFn: async ({ ids, val }: { ids: string[]; val: boolean }) => {
      await supabase.from('products').update({ is_published: val }).in('id', ids)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      setSelectedIds([])
    },
  })

  const bulkToggleFeatured = useMutation({
    mutationFn: async ({ ids, val }: { ids: string[]; val: boolean }) => {
      await supabase.from('products').update({ is_featured: val }).in('id', ids)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      setSelectedIds([])
    },
  })

  const bulkDeleteProducts = useMutation({
    mutationFn: async (ids: string[]) => {
      await supabase.from('products').delete().in('id', ids)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      setSelectedIds([])
    },
  })

  const filtered = products?.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === 'price_asc') return a.selling_price - b.selling_price
    if (sortBy === 'price_desc') return b.selling_price - a.selling_price
    if (sortBy === 'stock_asc') return a.stock - b.stock
    if (sortBy === 'stock_desc') return b.stock - a.stock
    return 0 // default is newest, already sorted by DB
  })

  const [page, setPage] = useState(0)
  const pageSize = 15

  // Reset page when search or sort changes
  useEffect(() => {
    setPage(0)
  }, [search, sortBy])

  const paginatedProducts = useMemo(() => {
    if (!filtered) return []
    const from = page * pageSize
    const to = from + pageSize
    return filtered.slice(from, to)
  }, [filtered, page])

  const totalPages = filtered ? Math.ceil(filtered.length / pageSize) : 0

  const allFilteredSelected = filtered && filtered.length > 0 && filtered.every(p => selectedIds.includes(p.id))
  const someFilteredSelected = filtered && filtered.length > 0 && filtered.some(p => selectedIds.includes(p.id)) && !allFilteredSelected

  const handleSelectAllToggle = () => {
    if (!filtered) return
    if (allFilteredSelected) {
      // Unselect all filtered items
      const filteredIds = filtered.map(p => p.id)
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)))
    } else {
      // Select all filtered items (merge with existing selected items if any)
      const filteredIds = filtered.map(p => p.id)
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])))
    }
  }

  return (
    <AdminLayout>
      <div className="p-8 pb-32">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gray-400 text-sm mb-1">Products</p>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          </div>
          <Link to="/admin/products/new" className="flex items-center gap-2 bg-brand-400 hover:bg-brand-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm">
            <Plus size={16} /> Add Product
          </Link>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full border border-gray-200 focus:border-brand-400 rounded-xl pl-9 pr-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none bg-white text-sm"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <select
              title="Sort products"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full sm:w-48 appearance-none border border-gray-200 focus:border-brand-400 rounded-xl pl-4 pr-10 py-2.5 text-sm text-gray-900 outline-none bg-white cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="stock_asc">Stock: Low to High</option>
              <option value="stock_desc">Stock: High to Low</option>
            </select>
            <ArrowDownUp size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : filtered?.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No products yet</p>
            </div>
          ) : (
            <div>
              {/* Header Select All Bar */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 select-none">
                <input
                  type="checkbox"
                  title="Select All"
                  checked={allFilteredSelected}
                  ref={el => {
                    if (el) {
                      el.indeterminate = !!someFilteredSelected
                    }
                  }}
                  onChange={handleSelectAllToggle}
                  className="w-4 h-4 rounded accent-brand-400 text-brand-400 focus:ring-brand-400/20 border-gray-300 cursor-pointer"
                />
                <span>Select All ({filtered?.length} products listed)</span>
              </div>

              <div className="divide-y divide-gray-50">
                {paginatedProducts.map(product => {
                  const isChecked = selectedIds.includes(product.id)
                  return (
                    <div key={product.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        <input
                          type="checkbox"
                          title="Select product"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, product.id])
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== product.id))
                            }
                          }}
                          className="w-4 h-4 rounded accent-brand-400 text-brand-400 focus:ring-brand-400/20 border-gray-300 cursor-pointer flex-shrink-0"
                        />
                        <img
                          src={product.images?.[0] || 'https://placehold.co/48x48/f3f4f6/9ca3af?text=?'}
                          alt=""
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 text-sm font-medium truncate">{product.title}</p>
                          {quickEditId === product.id ? (
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="number"
                                value={quickEditPrice}
                                onChange={e => setQuickEditPrice(e.target.value)}
                                placeholder="Price"
                                className="w-20 sm:w-24 border border-gray-200 focus:border-brand-400 rounded px-2 py-1 text-xs text-gray-900 outline-none bg-white"
                              />
                              <input
                                type="number"
                                value={quickEditStock}
                                onChange={e => setQuickEditStock(e.target.value)}
                                placeholder="Stock"
                                className="w-16 sm:w-20 border border-gray-200 focus:border-brand-400 rounded px-2 py-1 text-xs text-gray-900 outline-none bg-white"
                              />
                              <button
                                onClick={() => {
                                  const price = parseFloat(quickEditPrice)
                                  const stock = parseInt(quickEditStock, 10)
                                  if (!isNaN(price) && !isNaN(stock)) {
                                    quickEditProduct.mutate({ id: product.id, selling_price: price, stock })
                                  }
                                }}
                                className="w-6 h-6 bg-green-50 text-green-600 hover:bg-green-100 rounded flex items-center justify-center transition-colors flex-shrink-0"
                                title="Save"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={() => setQuickEditId(null)}
                                className="w-6 h-6 bg-red-50 text-red-600 hover:bg-red-100 rounded flex items-center justify-center transition-colors flex-shrink-0"
                                title="Cancel"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <p className="text-gray-400 text-xs truncate">{formatPrice(product.selling_price, context?.currency)} · {product.category} · Stock: {product.stock}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0 justify-end sm:justify-start">
                        {/* Feature toggle */}
                        <button
                          onClick={() => toggleFeatured.mutate({ id: product.id, val: !product.is_featured })}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${product.is_featured ? 'bg-brand-400/10 text-brand-400' : 'bg-gray-100 text-gray-400 hover:text-brand-400'}`}
                          title="Toggle featured"
                        >
                          <Star size={14} fill={product.is_featured ? 'currentColor' : 'none'} />
                        </button>
                        {/* Publish toggle switch */}
                        <div className="flex items-center gap-2 px-1">
                          <button
                            onClick={() => togglePublish.mutate({ id: product.id, val: !product.is_published })}
                            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 cursor-pointer ${product.is_published ? 'bg-green-500' : 'bg-gray-300'}`}
                            title={product.is_published ? 'Unpublish' : 'Publish'}
                          >
                            <span
                              className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${product.is_published ? 'translate-x-4' : 'translate-x-0'}`}
                            />
                          </button>
                        </div>
                        {/* Quick Edit */}
                        <button
                          onClick={() => {
                            if (quickEditId === product.id) {
                              setQuickEditId(null)
                            } else {
                              setQuickEditId(product.id)
                              setQuickEditPrice(product.selling_price?.toString() || '0')
                              setQuickEditStock(product.stock?.toString() || '0')
                            }
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${quickEditId === product.id ? 'bg-brand-400 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                          title="Quick Edit"
                        >
                          <Zap size={14} />
                        </button>
                        {/* Duplicate */}
                        <Link
                          to={`/admin/products/new?duplicate=${product.id}`}
                          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors text-gray-500"
                          title="Duplicate Product"
                        >
                          <Copy size={14} />
                        </Link>
                        {/* Edit */}
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors text-gray-500"
                          title="Edit Details"
                        >
                          <Pencil size={14} />
                        </Link>
                        {/* Delete */}
                        <button
                          onClick={() => {
                            if (confirm('Delete this product?')) deleteProduct.mutate(product.id)
                          }}
                          className="w-8 h-8 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-lg flex items-center justify-center transition-colors text-gray-400"
                          title="Delete Product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50/30 border-t border-gray-100 text-sm select-none">
                  <div className="text-gray-500 text-xs">
                    Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, filtered?.length || 0)} of {filtered?.length || 0} products
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors disabled:pointer-events-none"
                    >
                      Previous
                    </button>
                    <span className="text-gray-600 text-xs font-medium px-2">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors disabled:pointer-events-none"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 100, x: '-50%', opacity: 0 }}
            className="fixed bottom-6 left-1/2 w-[calc(100%-2rem)] max-w-4xl bg-white/95 dark:bg-dark-800/95 backdrop-blur-md border border-gray-100 dark:border-brand-400/15 shadow-xl rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-40 transition-colors duration-300"
          >
            <div className="flex items-center gap-3">
              <span className="bg-brand-400/10 text-brand-400 font-semibold px-2.5 py-1 rounded-lg text-xs">
                {selectedIds.length} selected
              </span>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
              >
                Clear Selection
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={() => bulkTogglePublish.mutate({ ids: selectedIds, val: true })}
                disabled={bulkTogglePublish.isPending}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Eye size={13} /> Publish
              </button>
              <button
                onClick={() => bulkTogglePublish.mutate({ ids: selectedIds, val: false })}
                disabled={bulkTogglePublish.isPending}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <EyeOff size={13} /> Unpublish
              </button>
              <button
                onClick={() => bulkToggleFeatured.mutate({ ids: selectedIds, val: true })}
                disabled={bulkToggleFeatured.isPending}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Star size={13} fill="currentColor" /> Feature
              </button>
              <button
                onClick={() => bulkToggleFeatured.mutate({ ids: selectedIds, val: false })}
                disabled={bulkToggleFeatured.isPending}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Star size={13} /> Unfeature
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.length} products? This action cannot be undone.`)) {
                    bulkDeleteProducts.mutate(selectedIds)
                  }
                }}
                disabled={bulkDeleteProducts.isPending}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:text-red-400 dark:bg-red-950/20 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}

// Fix missing import
function Package(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
}

