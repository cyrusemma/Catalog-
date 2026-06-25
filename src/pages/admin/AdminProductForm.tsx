import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Plus, X, ImagePlus, Upload } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase, supabaseUrl } from '../../lib/supabase'
import { slugify } from '../../lib/utils'
import { useCategoryTree, topLevelCategories, childCategories, findCategory } from '../../hooks/useProducts'
import {
  extensionForMime,
  isValidImageUrl,
  validateImageFile,
  validateProductForm,
} from '../../lib/productValidation'
import ImageCropper from '../../components/admin/ImageCropper'

interface FormData {
  title: string; brand: string; description: string
  parent_category_id: string; category_id: string
  selling_price: string; original_price: string; discount_percent: string
  stock: string; stock_status: 'in_stock' | 'few_units_left' | 'out_of_stock'
  images: string[]; key_features: string[]; sizes: string[]
  is_featured: boolean; is_published: boolean
  is_preorder: boolean
  free_delivery: boolean; delivery_fee: string
  flash_sale_price: string; flash_sale_ends_at: string
}

// Default units assigned when "In Stock" is picked, so the admin never has to
// type or clear the number for a generally-available product.
const DEFAULT_IN_STOCK_UNITS = '10'

const emptyForm: FormData = {
  title: '', brand: '', description: '',
  parent_category_id: '', category_id: '',
  selling_price: '', original_price: '', discount_percent: '',
  stock: '1', stock_status: 'few_units_left',
  images: [], key_features: [], sizes: [],
  is_featured: false, is_published: false,
  is_preorder: false,
  free_delivery: false, delivery_fee: '20',
  flash_sale_price: '', flash_sale_ends_at: '',
}

/** Convert a stored ISO timestamp to the value a <input type="datetime-local"> expects (local time, no seconds). */
function isoToLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const tzOffsetMs = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16)
}

async function resolveUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title) || 'product'
  let slug = base
  let n = 0
  while (true) {
    let query = supabase.from('products').select('id').eq('slug', slug)
    if (excludeId) query = query.neq('id', excludeId)
    const { data } = await query.maybeSingle()
    if (!data) return slug
    n += 1
    slug = `${base}-${n}`
  }
}

export default function AdminProductForm() {
  const { id } = useParams()
  const isEdit = id && id !== 'new'
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState<FormData>(emptyForm)

  const { data: context } = useQuery({
    queryKey: ['admin-user-context'],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      const isAdmin = user?.app_metadata?.role === 'admin'
      let storeId: string | null = null

      if (user && !isAdmin) {
        const { data: store } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle()
        if (store) storeId = store.id
      }
      return { isAdmin, storeId }
    }
  })
  const [newFeature, setNewFeature] = useState('')
  const [newSize, setNewSize] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [notifying, setNotifying] = useState(false)
  const [notifyMessage, setNotifyMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [currentCropFile, setCurrentCropFile] = useState<{ url: string; file: File } | null>(null)
  const [creatingCategory, setCreatingCategory] = useState<'parent' | 'sub' | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: categoryTree } = useCategoryTree()
  const parents = topLevelCategories(categoryTree)
  const subs = form.parent_category_id ? childCategories(categoryTree, form.parent_category_id) : []

  const addImageUrl = (raw: string) => {
    const url = raw.trim()
    if (!url) return
    if (!isValidImageUrl(url)) {
      setUploadError('Image URL must start with http:// or https://')
      return
    }
    setUploadError('')
    setForm(f => ({ ...f, images: [...f.images, url] }))
    setNewImageUrl('')
  }

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploadError('')
    const fileArray = Array.from(files)
    try {
      for (const file of fileArray) {
        const fileError = validateImageFile(file)
        if (fileError) throw new Error(fileError)
      }
      setPendingFiles(prev => [...prev, ...fileArray])
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    if (pendingFiles.length > 0 && !currentCropFile && !uploading) {
      const file = pendingFiles[0]
      setCurrentCropFile({ url: URL.createObjectURL(file), file })
    }
  }, [pendingFiles, currentCropFile, uploading])

  const proceedWithUpload = async (fileToUpload: Blob | File, contentType: string) => {
    setUploading(true)
    setUploadError('')
    try {
      const ext = extensionForMime(contentType) || 'webp'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from('product-images').upload(path, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType,
      })
      if (error) throw error
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      setForm(f => ({ ...f, images: [...f.images, data.publicUrl] }))
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setCurrentCropFile(prev => {
        if (prev) URL.revokeObjectURL(prev.url)
        return null
      })
      setPendingFiles(prev => prev.slice(1))
    }
  }

  const onCropDone = (croppedBlob: Blob) => {
    if (!currentCropFile) return
    proceedWithUpload(croppedBlob, 'image/webp')
  }

  const onCropSkip = () => {
    if (!currentCropFile) return
    proceedWithUpload(currentCropFile.file, currentCropFile.file.type)
  }

  const { data: existingProduct } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
    enabled: !!isEdit,
  })

  useEffect(() => {
    if (existingProduct && categoryTree) {
      const selectedCat = findCategory(categoryTree, existingProduct.category_id)
      const parentCat = selectedCat?.parent_id
        ? findCategory(categoryTree, selectedCat.parent_id)
        : selectedCat
      setForm({
        title: existingProduct.title || '',
        brand: existingProduct.brand || '',
        description: existingProduct.description || '',
        parent_category_id: parentCat?.id || '',
        category_id: existingProduct.category_id || '',
        selling_price: existingProduct.selling_price?.toString() || '',
        original_price: existingProduct.original_price?.toString() || '',
        discount_percent: existingProduct.discount_percent?.toString() || '',
        stock: existingProduct.stock?.toString() || '1',
        stock_status: existingProduct.stock_status || 'few_units_left',
        images: existingProduct.images || [],
        key_features: existingProduct.key_features || [],
        sizes: existingProduct.sizes || [],
        is_featured: existingProduct.is_featured || false,
        is_published: existingProduct.is_published || false,
        is_preorder: existingProduct.is_preorder || false,
        free_delivery: !existingProduct.delivery_fee || Number(existingProduct.delivery_fee) === 0,
        delivery_fee: existingProduct.delivery_fee && Number(existingProduct.delivery_fee) > 0
          ? Number(existingProduct.delivery_fee).toString()
          : '',
        flash_sale_price: existingProduct.flash_sale_price != null
          ? Number(existingProduct.flash_sale_price).toString()
          : '',
        flash_sale_ends_at: isoToLocalInput(existingProduct.flash_sale_ends_at),
      })
    }
  }, [existingProduct, categoryTree])

  const set = (key: keyof FormData, val: FormData[keyof FormData]) =>
    setForm(f => ({ ...f, [key]: val }))

  // Picking a stock status. Choosing "In Stock" auto-fills a sensible default
  // unit count so the number field is ready without the admin clearing/typing it.
  const selectStockStatus = (status: FormData['stock_status']) =>
    setForm(f => ({
      ...f,
      stock_status: status,
      stock: status === 'in_stock' && (!f.stock || f.stock === '0')
        ? DEFAULT_IN_STOCK_UNITS
        : f.stock,
    }))

  const createCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    setCategoryError('')
    const slug = slugify(name) || `cat-${Date.now()}`
    const parentId = creatingCategory === 'sub' ? form.parent_category_id : null
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, slug, parent_id: parentId, sort_order: 99 })
      .select('id, name, slug, parent_id, sort_order')
      .single()
    if (error || !data) {
      setCategoryError(error?.message || 'Could not create category')
      return
    }
    await qc.invalidateQueries({ queryKey: ['categories', 'tree'] })
    if (creatingCategory === 'parent') {
      setForm(f => ({ ...f, parent_category_id: data.id, category_id: '' }))
    } else {
      setForm(f => ({ ...f, category_id: data.id }))
    }
    setCreatingCategory(null)
    setNewCategoryName('')
  }

  const setPrice = (key: 'selling_price' | 'original_price', val: string) =>
    setForm(f => {
      const next = { ...f, [key]: val }
      const sell = parseFloat(next.selling_price)
      const orig = parseFloat(next.original_price)
      if (next.selling_price && next.original_price && orig > 0 && sell > 0 && sell < orig) {
        next.discount_percent = Math.round(((orig - sell) / orig) * 100).toString()
      } else if (!next.original_price || !next.selling_price) {
        next.discount_percent = ''
      }
      return next
    })

  /**
   * Call the notify-new-arrival Edge Function to fan a Web Push out to every
   * subscriber whose profile has notify_new_arrivals=true. Only meaningful for
   * existing, published products — we hide the button otherwise so you can't
   * accidentally push a draft.
   */
  const notifySubscribers = async () => {
    if (!isEdit || !id) return
    setNotifyMessage(null)
    setNotifying(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setNotifyMessage({ kind: 'err', text: 'You need to be signed in as admin.' })
        return
      }
      const res = await fetch(`${supabaseUrl}/functions/v1/notify-new-arrival`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: id }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNotifyMessage({ kind: 'err', text: result.error || `Request failed (${res.status})` })
        return
      }
      const sent = result.sent ?? 0
      const total = result.total ?? 0
      setNotifyMessage({
        kind: 'ok',
        text: total === 0
          ? 'No subscribers yet — nothing to notify.'
          : `Sent to ${sent} of ${total} subscriber${total === 1 ? '' : 's'}.`,
      })
    } catch (err) {
      setNotifyMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Could not notify.' })
    } finally {
      setNotifying(false)
    }
  }

  const handleSave = async (publish = false) => {
    setSaveError('')
    const validationError = validateProductForm(form, { publishing: publish })
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setSaving(true)
    try {
      const slug = await resolveUniqueSlug(form.title, isEdit ? id : undefined)
      const payload = {
        title: form.title.trim(),
        slug,
        brand: form.brand.trim() || null,
        category_id: form.category_id || form.parent_category_id || null,
        category: findCategory(categoryTree, form.category_id || form.parent_category_id)?.name || null,
        description: form.description.trim() || null,
        selling_price: parseFloat(form.selling_price) || 0,
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        discount_percent: form.discount_percent ? parseInt(form.discount_percent, 10) : null,
        stock: parseInt(form.stock, 10) || 0,
        stock_status: form.stock_status,
        images: form.images,
        key_features: form.key_features,
        sizes: form.sizes,
        is_featured: form.is_featured,
        is_published: publish ? true : form.is_published,
        is_preorder: form.is_preorder,
        source_url: null,
        source_price: null,
        delivery_fee: form.free_delivery ? 0 : (parseFloat(form.delivery_fee) || 0),
        // A flash sale only counts when both a price and an end time are set;
        // otherwise clear both so the storefront treats it as no sale.
        flash_sale_price: form.flash_sale_price && form.flash_sale_ends_at
          ? parseFloat(form.flash_sale_price) || null
          : null,
        flash_sale_ends_at: form.flash_sale_price && form.flash_sale_ends_at
          ? new Date(form.flash_sale_ends_at).toISOString()
          : null,
      }

      const dbPayload = {
        ...payload,
        ...(context?.storeId ? { store_id: context.storeId } : {})
      }

      const { error } = isEdit
        ? await supabase.from('products').update(dbPayload).eq('id', id!)
        : await supabase.from('products').insert(dbPayload)

      if (error) throw error

      await qc.invalidateQueries({ queryKey: ['admin-products'] })
      await qc.invalidateQueries({ queryKey: ['products'] })
      navigate('/admin/products')
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl pb-32 lg:pb-8">
        <div className="flex items-center gap-3 mb-5 lg:mb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            title="Go back"
            className="w-9 h-9 lg:w-8 lg:h-8 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          >
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <div className="min-w-0">
            <p className="text-gray-400 text-xs lg:text-sm">Products</p>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-5 lg:gap-6">
          <div className="lg:col-span-3 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-4">Images</h2>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {form.images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} alt="" className="w-full aspect-square object-cover rounded-xl" />
                    <button
                      onClick={() => set('images', form.images.filter((_, j) => j !== i))}
                      aria-label={`Remove image ${i + 1}`}
                      title={`Remove image ${i + 1}`}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {form.images.length === 0 && (
                  <div className="col-span-2 aspect-video bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
                    <div className="text-center">
                      <ImagePlus size={24} className="text-gray-300 mx-auto mb-1" />
                      <p className="text-gray-400 text-xs">No images yet</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                aria-label="Upload product images"
                title="Upload product images"
                onChange={e => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full bg-brand-400 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 mb-2"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? 'Uploading...' : 'Upload Images'}
              </button>
              {uploadError && <p className="text-red-500 text-xs mb-2">{uploadError}</p>}
              <div className="flex gap-2">
                <input
                  value={newImageUrl}
                  onChange={e => setNewImageUrl(e.target.value)}
                  onPaste={e => {
                    const pasted = e.clipboardData.getData('text').trim()
                    if (pasted && isValidImageUrl(pasted)) {
                      e.preventDefault()
                      addImageUrl(pasted)
                    }
                  }}
                  placeholder="Or paste image URL..."
                  onKeyDown={e => { if (e.key === 'Enter') addImageUrl(newImageUrl) }}
                  className="flex-1 border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white outline-none"
                />
                <button
                  onClick={() => addImageUrl(newImageUrl)}
                  aria-label="Add image from URL"
                  title="Add image from URL"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-xl transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-4">Product Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1.5 uppercase tracking-wide">
                    Product Title *
                  </label>
                  <textarea value={form.title} onChange={e => set('title', e.target.value)} placeholder="Enter product title" rows={2} className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white resize-y" />
                </div>

                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Brand</label>
                  <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Samsung" className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white" />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {/* Parent category */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="parent-category" className="block text-gray-600 text-xs font-medium">Category</label>
                      <button
                        type="button"
                        onClick={() => { setCreatingCategory('parent'); setNewCategoryName(''); setCategoryError('') }}
                        className="text-brand-400 text-[11px] font-semibold hover:text-brand-500"
                      >
                        + New
                      </button>
                    </div>
                    <select
                      id="parent-category"
                      aria-label="Category"
                      value={form.parent_category_id}
                      onChange={e => setForm(f => ({ ...f, parent_category_id: e.target.value, category_id: '' }))}
                      className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 outline-none text-sm bg-gray-50 focus:bg-white"
                    >
                      <option value="">Select category</option>
                      {parents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Sub-category */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="sub-category" className="block text-gray-600 text-xs font-medium">Sub-category</label>
                      {form.parent_category_id && (
                        <button
                          type="button"
                          onClick={() => { setCreatingCategory('sub'); setNewCategoryName(''); setCategoryError('') }}
                          className="text-brand-400 text-[11px] font-semibold hover:text-brand-500"
                        >
                          + New
                        </button>
                      )}
                    </div>
                    <select
                      id="sub-category"
                      aria-label="Sub-category"
                      value={form.category_id}
                      onChange={e => set('category_id', e.target.value)}
                      disabled={!form.parent_category_id}
                      className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 outline-none text-sm bg-gray-50 focus:bg-white disabled:opacity-50"
                    >
                      <option value="">{form.parent_category_id ? 'Optional — leave blank for the parent only' : 'Pick a category first'}</option>
                      {subs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {creatingCategory && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-900">
                      {creatingCategory === 'parent' ? 'New top-level category' : `New sub-category under ${findCategory(categoryTree, form.parent_category_id)?.name}`}
                    </p>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createCategory() } }}
                        placeholder="e.g. Jewelries"
                        className="flex-1 border border-amber-300 focus:border-brand-400 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={createCategory}
                        className="bg-brand-400 hover:bg-brand-500 text-white text-sm font-semibold px-4 rounded-lg"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCreatingCategory(null); setCategoryError('') }}
                        aria-label="Cancel"
                        className="bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg px-3"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {categoryError && <p className="text-xs text-red-600">{categoryError}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Description</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Product description..." rows={4} className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white resize-none" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-4">Pricing</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1.5">Selling Price (GHS) *</label>
                  <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => setPrice('selling_price', e.target.value)} placeholder="0.00" className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Compare-at Price (GHS)</label>
                  <input type="number" min="0" step="0.01" value={form.original_price} onChange={e => setPrice('original_price', e.target.value)} placeholder="0.00" className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Discount % (auto)</label>
                  <input type="number" readOnly value={form.discount_percent} placeholder="—" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-100 cursor-not-allowed" />
                </div>
              </div>
              <p className="text-gray-400 text-xs mt-3">
                Compare-at price shows as a strikethrough next to your selling price to highlight savings.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-4">Key Features</h2>
              <div className="space-y-2 mb-3">
                {form.key_features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <span className="flex-1 text-sm text-gray-700">{f}</span>
                    <button
                      onClick={() => set('key_features', form.key_features.filter((_, j) => j !== i))}
                      aria-label={`Remove feature ${i + 1}`}
                      title={`Remove feature ${i + 1}`}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newFeature} onChange={e => setNewFeature(e.target.value)} placeholder="Add a feature..." onKeyDown={e => { if (e.key === 'Enter' && newFeature.trim()) { set('key_features', [...form.key_features, newFeature.trim()]); setNewFeature('') } }} className="flex-1 border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white outline-none" />
                <button
                  type="button"
                  onClick={() => { if (newFeature.trim()) { set('key_features', [...form.key_features, newFeature.trim()]); setNewFeature('') } }}
                  aria-label="Add feature"
                  title="Add feature"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-xl transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-1">Available Sizes</h2>
              <p className="text-gray-400 text-[11px] mb-3">
                Add any sizes/variants the customer can pick from — e.g. S, M, L or shoe sizes like 38, 39, 40. Leave empty if not applicable.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {form.sizes.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm rounded-full pl-3 pr-1 py-1">
                    {s}
                    <button
                      type="button"
                      onClick={() => set('sizes', form.sizes.filter((_, j) => j !== i))}
                      aria-label={`Remove size ${s}`}
                      className="w-5 h-5 rounded-full hover:bg-gray-200 text-gray-500 flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newSize}
                  onChange={e => setNewSize(e.target.value)}
                  placeholder="e.g. M or 42"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newSize.trim()) {
                      e.preventDefault()
                      const val = newSize.trim()
                      if (!form.sizes.includes(val)) set('sizes', [...form.sizes, val])
                      setNewSize('')
                    }
                  }}
                  className="flex-1 border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = newSize.trim()
                    if (val && !form.sizes.includes(val)) set('sizes', [...form.sizes, val])
                    setNewSize('')
                  }}
                  aria-label="Add size"
                  title="Add size"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-xl transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-4">Stock Status</h2>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {([
                  { value: 'in_stock', label: 'In Stock' },
                  { value: 'few_units_left', label: 'Few Units Left' },
                  { value: 'out_of_stock', label: 'Out of Stock' },
                ] as const).map(s => (
                  <button key={s.value} type="button" onClick={() => selectStockStatus(s.value)} className={`py-2 px-1 rounded-xl text-xs font-medium transition-colors ${form.stock_status === s.value ? 'bg-brand-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
              {form.stock_status !== 'out_of_stock' && (
                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Units left</label>
                  <input type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="e.g. 3" className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white" />
                  {form.stock_status === 'in_stock' && (
                    <p className="text-gray-400 text-[11px] mt-2">Pre-filled for you — adjust only if you want an exact count.</p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-4">Delivery</h2>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => set('free_delivery', true)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium transition-colors ${form.free_delivery ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Free Delivery
                </button>
                <button
                  type="button"
                  onClick={() => set('free_delivery', false)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium transition-colors ${!form.free_delivery ? 'bg-brand-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Charged
                </button>
              </div>
              {!form.free_delivery && (
                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Delivery fee (GHS)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.delivery_fee}
                    onChange={e => set('delivery_fee', e.target.value)}
                    placeholder="e.g. 25.00"
                    className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white"
                  />
                  <p className="text-gray-400 text-[11px] mt-2">
                    Shown to the customer on the product page and added to the cart total.
                  </p>
                </div>
              )}
              {form.free_delivery && (
                <p className="text-gray-400 text-[11px]">
                  Customer sees a "Free delivery" badge on this product.
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-1">Flash Sale</h2>
              <p className="text-gray-400 text-[11px] mb-4">
                Set a temporary sale price and an end time. Customers see a live countdown and the price reverts automatically when it ends. Leave blank for no sale.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Sale price (GHS)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.flash_sale_price}
                    onChange={e => set('flash_sale_price', e.target.value)}
                    placeholder="Lower than selling price"
                    className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Ends at</label>
                  <input
                    type="datetime-local"
                    value={form.flash_sale_ends_at}
                    onChange={e => set('flash_sale_ends_at', e.target.value)}
                    aria-label="Flash sale end time"
                    className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white"
                  />
                </div>
                {form.selling_price && form.flash_sale_price && parseFloat(form.flash_sale_price) >= parseFloat(form.selling_price) && (
                  <p className="text-amber-600 text-[11px]">Sale price should be lower than the selling price ({form.selling_price}) to show as a deal.</p>
                )}
                {(form.flash_sale_price || form.flash_sale_ends_at) && (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, flash_sale_price: '', flash_sale_ends_at: '' }))}
                    className="text-gray-500 hover:text-red-500 text-xs font-medium"
                  >
                    Clear flash sale
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-1">Options</h2>
              {[
                { key: 'is_featured', label: 'Featured product', desc: 'Show on homepage featured section' },
                { key: 'is_preorder', label: 'Preorder', desc: 'Shows a "Preorder" badge — item not in hand yet' },
                { key: 'is_published', label: 'Published', desc: 'Visible to customers' },
              ].map(opt => (
                <label key={opt.key} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form[opt.key as keyof FormData] as boolean} onChange={e => set(opt.key as keyof FormData, e.target.checked)} className="mt-0.5 accent-brand-400" />
                  <div>
                    <p className="text-gray-900 text-sm font-medium">{opt.label}</p>
                    <p className="text-gray-400 text-xs">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              {saveError && (
                <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">{saveError}</p>
              )}
              <button onClick={() => handleSave(true)} disabled={saving || !form.title || !form.selling_price} className="w-full bg-brand-400 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                {saving ? 'Saving...' : 'Save & Publish'}
              </button>
              <button onClick={() => handleSave(false)} disabled={saving || !form.title} className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold py-3 rounded-xl transition-colors text-sm">
                Save as Draft
              </button>

              {/* Push fan-out. Only meaningful for products that already exist
                  and have been published — otherwise nothing exists for the
                  subscriber to open. */}
              {isEdit && form.is_published && (
                <div className="pt-2 mt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={notifySubscribers}
                    disabled={notifying}
                    className="w-full bg-white border border-brand-400/40 hover:bg-brand-400/5 text-brand-500 font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {notifying ? 'Sending…' : 'Notify subscribers'}
                  </button>
                  {notifyMessage && (
                    <p className={`text-xs mt-2 ${notifyMessage.kind === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                      {notifyMessage.text}
                    </p>
                  )}
                  <p className="text-gray-400 text-[11px] mt-2 leading-snug">
                    Sends a Web Push to every customer who opted in for new-arrival alerts. Safe to tap repeatedly — duplicate notifications collapse into one on the customer's device.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {currentCropFile && (
        <ImageCropper
          imageSrc={currentCropFile.url}
          onCropDone={onCropDone}
          onCancel={onCropSkip}
        />
      )}
    </AdminLayout>
  )
}
