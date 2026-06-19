import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Star, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

export default function AdminProducts() {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const qc = useQueryClient()

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
      return data || []
    },
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
  )

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

        {/* Search */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 focus:border-brand-400 rounded-xl pl-9 pr-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none bg-white text-sm"
          />
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
                {filtered?.map(product => {
                  const isChecked = selectedIds.includes(product.id)
                  return (
                    <div key={product.id} className="flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, product.id])
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== product.id))
                          }
                        }}
                        className="w-4 h-4 rounded accent-brand-400 text-brand-400 focus:ring-brand-400/20 border-gray-300 cursor-pointer"
                      />
                      <img
                        src={product.images?.[0] || 'https://placehold.co/48x48/f3f4f6/9ca3af?text=?'}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 text-sm font-medium truncate">{product.title}</p>
                        <p className="text-gray-400 text-xs">{formatPrice(product.selling_price)} · {product.category}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Feature toggle */}
                        <button
                          onClick={() => toggleFeatured.mutate({ id: product.id, val: !product.is_featured })}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${product.is_featured ? 'bg-brand-400/10 text-brand-400' : 'bg-gray-100 text-gray-400 hover:text-brand-400'}`}
                          title="Toggle featured"
                        >
                          <Star size={14} fill={product.is_featured ? 'currentColor' : 'none'} />
                        </button>
                        {/* Publish toggle */}
                        <button
                          onClick={() => togglePublish.mutate({ id: product.id, val: !product.is_published })}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${product.is_published ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400'}`}
                          title={product.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {product.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        {/* Edit */}
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors text-gray-500"
                        >
                          <Pencil size={14} />
                        </Link>
                        {/* Delete */}
                        <button
                          onClick={() => {
                            if (confirm('Delete this product?')) deleteProduct.mutate(product.id)
                          }}
                          className="w-8 h-8 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-lg flex items-center justify-center transition-colors text-gray-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
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

