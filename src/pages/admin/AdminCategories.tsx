import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  FolderTree, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  ChevronRight, 
  Layers, 
  ArrowUpDown, 
  X, 
  Upload, 
  Image as ImageIcon,
  AlertCircle,
  Package
} from 'lucide-react'

import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { compressImage } from '../../lib/imageOptimization'
import { toast } from 'sonner'
import type { Category } from '../../types'

export default function AdminCategories() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<number>(0)
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [formError, setFormError] = useState('')

  // Fetch all categories
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data || []
    },
  })

  // Fetch product counts per category
  const { data: productCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ['category-product-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category_id')
      if (error) return {}
      const counts: Record<string, number> = {}
      data?.forEach((p) => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1
        }
      })
      return counts
    },
  })

  // Group into tree
  const parentCategories = useMemo(() => {
    return categories
      .filter(c => !c.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [categories])

  const subCategoriesByParent = useMemo(() => {
    const map = new Map<string, Category[]>()
    categories.forEach(c => {
      if (c.parent_id) {
        const list = map.get(c.parent_id) || []
        list.push(c)
        map.set(c.parent_id, list)
      }
    })
    // Sort each group
    map.forEach(list => list.sort((a, b) => a.sort_order - b.sort_order))
    return map
  }, [categories])

  // Filtered categories
  const filteredParents = useMemo(() => {
    if (!search.trim()) return parentCategories
    const q = search.toLowerCase()
    return parentCategories.filter(p => {
      const matchParent = p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      const children = subCategoriesByParent.get(p.id) || []
      const matchChild = children.some(c => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
      return matchParent || matchChild
    })
  }, [parentCategories, subCategoriesByParent, search])

  // Open modal for Create
  const handleOpenCreate = (targetParentId?: string | null) => {
    setEditingCategory(null)
    setName('')
    setSlug('')
    setParentId(targetParentId || null)
    setSortOrder(categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) + 10 : 10)
    setDescription('')
    setImageUrl('')
    setFormError('')
    setIsModalOpen(true)
  }

  // Open modal for Edit
  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category)
    setName(category.name)
    setSlug(category.slug)
    setParentId(category.parent_id)
    setSortOrder(category.sort_order ?? 0)
    setDescription(category.description || '')
    setImageUrl(category.image_url || '')
    setFormError('')
    setIsModalOpen(true)
  }

  // Auto slug generation
  const handleNameChange = (val: string) => {
    setName(val)
    if (!editingCategory) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
      )
    }
  }

  // Upload image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const compressed = await compressImage(file, { maxWidthOrHeight: 1200, maxSizeMB: 0.8 })
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = `categories/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, compressed, { upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(filePath)
      setImageUrl(publicUrlData.publicUrl)
      toast.success('Image uploaded successfully')
    } catch (err: any) {
      toast.error('Failed to upload image: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  // Save category mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Category name is required')
      if (!slug.trim()) throw new Error('Category slug is required')

      const payload: any = {
        name: name.trim(),
        slug: slug.trim(),
        parent_id: parentId || null,
        sort_order: Number(sortOrder) || 0,
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setIsModalOpen(false)
      toast.success(editingCategory ? 'Category updated!' : 'Category created!')
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to save category')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (category: Category) => {
      const childCount = subCategoriesByParent.get(category.id)?.length || 0
      const prodCount = productCounts[category.id] || 0

      if (prodCount > 0) {
        if (!confirm(`Warning: ${prodCount} products are assigned to "${category.name}". Deleting it will detach these products from this category. Continue?`)) {
          return
        }
      } else if (childCount > 0) {
        if (!confirm(`Warning: "${category.name}" has ${childCount} sub-categories that will also be removed. Continue?`)) {
          return
        }
      } else {
        if (!confirm(`Are you sure you want to delete category "${category.name}"?`)) {
          return
        }
      }

      const { error } = await supabase.from('categories').delete().eq('id', category.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category deleted')
    },
    onError: (err: any) => {
      toast.error('Failed to delete: ' + err.message)
    },
  })

  // Reorder sort_order mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      const target = categories.find(c => c.id === id)
      if (!target) return
      const newOrder = Math.max(0, (target.sort_order ?? 0) + delta)
      const { error } = await supabase.from('categories').update({ sort_order: newOrder }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FolderTree className="w-7 h-7 text-amber-500" />
              Category Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Organize your catalog with top-level and nested sub-categories, custom images, and display order.
            </p>
          </div>
          <button
            onClick={() => handleOpenCreate(null)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Parent Category
          </button>
        </div>

        {/* Search Bar & Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-dark-900 p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>{parentCategories.length} Parent Categories</span>
            <span>•</span>
            <span>{categories.length - parentCategories.length} Sub-categories</span>
          </div>
        </div>

        {/* Categories Tree */}
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading categories...</div>
        ) : filteredParents.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-dark-900 rounded-2xl border border-gray-100 dark:border-white/5 p-8">
            <Layers className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">No categories found</p>
            <p className="text-xs text-gray-400 mt-1">Get started by creating your first category.</p>
            <button
              onClick={() => handleOpenCreate(null)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Category
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredParents.map((parent) => {
              const children = subCategoriesByParent.get(parent.id) || []
              const prodCount = productCounts[parent.id] || 0

              return (
                <div
                  key={parent.id}
                  className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-200/80 dark:border-white/5 overflow-hidden shadow-sm"
                >
                  {/* Parent Category Row */}
                  <div className="p-4 sm:p-5 flex items-center justify-between gap-4 bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {parent.image_url ? (
                        <img
                          src={parent.image_url}
                          alt={parent.name}
                          className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                          <FolderTree className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                            {parent.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                            /{parent.slug}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3 text-amber-500" />
                            {prodCount} products
                          </span>
                          <span>•</span>
                          <span>Sort order: {parent.sort_order}</span>
                          {parent.description && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-xs">{parent.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center mr-2 border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                        <button
                          title="Increase Priority"
                          onClick={() => reorderMutation.mutate({ id: parent.id, delta: -1 })}
                          className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        title="Add Sub-category"
                        onClick={() => handleOpenCreate(parent.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Add Sub</span>
                      </button>

                      <button
                        title="Edit Category"
                        onClick={() => handleOpenEdit(parent)}
                        className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        title="Delete Category"
                        onClick={() => deleteMutation.mutate(parent)}
                        className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-categories List */}
                  {children.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-white/5 divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-dark-900">
                      {children.map((child) => {
                        const childProdCount = productCounts[child.id] || 0
                        return (
                          <div
                            key={child.id}
                            className="pl-8 sm:pl-12 pr-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-50/60 dark:hover:bg-white/[0.01] transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                              {child.image_url ? (
                                <img
                                  src={child.image_url}
                                  alt={child.name}
                                  className="w-7 h-7 rounded-lg object-cover border border-gray-200 dark:border-white/10 shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-400 flex items-center justify-center shrink-0">
                                  <Layers className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                  {child.name}
                                </span>
                                <span className="ml-2 text-xs text-gray-400">
                                  /{child.slug} · {childProdCount} products · order: {child.sort_order}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                title="Edit Sub-category"
                                onClick={() => handleOpenEdit(child)}
                                className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="Delete Sub-category"
                                onClick={() => deleteMutation.mutate(child)}
                                className="p-1.5 text-red-400 hover:text-red-500 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Modal: Create / Edit Category */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-white dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/10">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingCategory ? 'Edit Category' : 'New Category'}
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                  {formError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {formError}
                    </div>
                  )}

                  {/* Parent selector */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                      Parent Category
                    </label>
                    <select
                      value={parentId || ''}
                      onChange={(e) => setParentId(e.target.value || null)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    >
                      <option value="">None (Top-Level Category)</option>
                      {parentCategories
                        .filter(p => p.id !== editingCategory?.id)
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Footwear, Men's Shoes"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  {/* Slug & Sort Order */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                        URL Slug *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. footwear"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                        Sort Order
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief category summary for SEO and browsing"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  {/* Image */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
                      Category Image / Banner
                    </label>
                    <div className="flex items-center gap-3">
                      {imageUrl ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
                          <img src={imageUrl} alt="Category preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full text-xs shadow-md"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-dark-800 border border-dashed border-gray-300 dark:border-white/10 flex items-center justify-center text-gray-400 shrink-0">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}

                      <div className="flex-1 space-y-1.5">
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          {isUploading ? 'Uploading...' : 'Upload Image'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={isUploading}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="url"
                          placeholder="Or paste image URL"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    {saveMutation.isPending ? 'Saving...' : 'Save Category'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  )
}
