import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Globe, Loader2, Plus, X, ImagePlus, Upload } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { slugify } from '../../lib/utils'
import {
  extensionForMime,
  isValidImageUrl,
  validateImageFile,
  validateProductForm,
} from '../../lib/productValidation'

const CATEGORIES = ['Electronics', 'Computing', 'Phones & Tablets', 'Fashion', 'Bags', 'Footwear', 'Lifestyle', 'Home & Office', 'Beauty', 'Sporting Goods', 'Other']

interface FormData {
  title: string; brand: string; category: string; description: string
  selling_price: string; original_price: string; discount_percent: string
  stock: string; stock_status: 'in_stock' | 'out_of_stock'
  images: string[]; key_features: string[]; is_featured: boolean; is_published: boolean
  source_url: string; source_price: string
}

const emptyForm: FormData = {
  title: '', brand: '', category: '', description: '',
  selling_price: '', original_price: '', discount_percent: '',
  stock: '1', stock_status: 'in_stock', images: [], key_features: [],
  is_featured: false, is_published: false, source_url: '', source_price: ''
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
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [newFeature, setNewFeature] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadError('')
    const uploaded: string[] = []
    try {
      for (const file of Array.from(files)) {
        const fileError = validateImageFile(file)
        if (fileError) throw new Error(fileError)

        const ext = extensionForMime(file.type)
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error } = await supabase.storage.from('product-images').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })
        if (error) throw error
        const { data } = supabase.storage.from('product-images').getPublicUrl(path)
        uploaded.push(data.publicUrl)
      }
      setForm(f => ({ ...f, images: [...f.images, ...uploaded] }))
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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
    if (existingProduct) {
      setForm({
        title: existingProduct.title || '',
        brand: existingProduct.brand || '',
        category: existingProduct.category || '',
        description: existingProduct.description || '',
        selling_price: existingProduct.selling_price?.toString() || '',
        original_price: existingProduct.original_price?.toString() || '',
        discount_percent: existingProduct.discount_percent?.toString() || '',
        stock: existingProduct.stock?.toString() || '1',
        stock_status: existingProduct.stock_status || 'in_stock',
        images: existingProduct.images || [],
        key_features: existingProduct.key_features || [],
        is_featured: existingProduct.is_featured || false,
        is_published: existingProduct.is_published || false,
        source_url: existingProduct.source_url || '',
        source_price: existingProduct.source_price?.toString() || '',
      })
    }
  }, [existingProduct])

  const set = (key: keyof FormData, val: FormData[keyof FormData]) =>
    setForm(f => ({ ...f, [key]: val }))

  const handleImport = async () => {
    if (!importUrl.trim()) return
    setImporting(true)
    setImportError('')
    try {
      const { data, error } = await supabase.functions.invoke('scrape-product', {
        body: { url: importUrl.trim() },
      })
      if (error) {
        const ctx = await error.context?.json?.().catch(() => null)
        throw new Error(ctx?.error || error.message || 'Import failed')
      }
      if (data?.error) throw new Error(data.error)
      if (data) {
        const scrapedPrice = data.selling_price?.toString()
        setForm(f => ({
          ...f,
          title: data.title || f.title,
          brand: data.brand || f.brand,
          category: data.category || f.category,
          description: data.description || f.description,
          images: data.images?.length ? data.images.filter(isValidImageUrl) : f.images,
          key_features: data.key_features?.length ? data.key_features : f.key_features,
          source_price: scrapedPrice || f.source_price,
          original_price: data.original_price?.toString() || f.original_price,
          discount_percent: data.discount_percent?.toString() || f.discount_percent,
          stock_status: data.stock_status || f.stock_status,
          source_url: importUrl.trim(),
        }))
      }
    } catch {
      setImportError('Could not import this URL. Check the link or fill in the form manually.')
    } finally {
      setImporting(false)
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
        category: form.category || null,
        description: form.description.trim() || null,
        selling_price: parseFloat(form.selling_price) || 0,
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        discount_percent: form.discount_percent ? parseInt(form.discount_percent, 10) : null,
        stock: parseInt(form.stock, 10) || 0,
        stock_status: form.stock_status,
        images: form.images,
        key_features: form.key_features,
        is_featured: form.is_featured,
        is_published: publish ? true : form.is_published,
        source_url: form.source_url || null,
        source_price: form.source_price ? parseFloat(form.source_price) : null,
      }

      const { error } = isEdit
        ? await supabase.from('products').update(payload).eq('id', id!)
        : await supabase.from('products').insert(payload)

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
      <div className="p-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            title="Go back"
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <div>
            <p className="text-gray-400 text-sm">Products</p>
            <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
          </div>
        </div>

        {!isEdit && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-brand-400" />
                <span className="font-semibold text-gray-900 text-sm">Import from Store URL</span>
              </div>
              <span className="text-gray-400 text-xs">Jumia · Amazon · AliExpress · eBay</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  placeholder="https://www.jumia.com.gh/product-name.html"
                  className="w-full border border-gray-200 focus:border-brand-400 rounded-xl pl-8 pr-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white"
                  onKeyDown={e => e.key === 'Enter' && handleImport()}
                />
              </div>
              <button
                onClick={handleImport}
                disabled={importing || !importUrl.trim()}
                className="bg-brand-400 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm flex items-center gap-2"
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : null}
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
            {importError && <p className="text-red-500 text-xs mt-2">{importError}</p>}
            <p className="text-gray-400 text-xs mt-2">
              Import fills source price and details — set your selling price before publishing.
            </p>
          </div>
        )}

        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-4">Product Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1.5 uppercase tracking-wide">
                    Product Title *
                  </label>
                  <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Enter product title" className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 text-xs font-medium mb-1.5">Brand</label>
                    <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Samsung" className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white" />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-gray-600 text-xs font-medium mb-1.5">Category</label>
                    <select id="category" aria-label="Category" value={form.category} onChange={e => set('category', e.target.value)} className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 outline-none text-sm bg-gray-50 focus:bg-white">
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Description</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Product description..." rows={4} className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white resize-none" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-4">Pricing</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1.5">Your Selling Price (GHS) *</label>
                  <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => set('selling_price', e.target.value)} placeholder="0.00" className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Original Price (GHS)</label>
                  <input type="number" min="0" step="0.01" value={form.original_price} onChange={e => set('original_price', e.target.value)} placeholder="0.00" className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Jumia Source Price (GHS)</label>
                  <input type="number" min="0" step="0.01" value={form.source_price} onChange={e => set('source_price', e.target.value)} placeholder="0.00" className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Discount %</label>
                  <input type="number" min="0" max="100" value={form.discount_percent} onChange={e => set('discount_percent', e.target.value)} placeholder="0" className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white" />
                </div>
              </div>
              {form.selling_price && form.source_price && (
                <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-green-700 text-xs font-medium">
                    💰 Profit: GHS {(parseFloat(form.selling_price) - parseFloat(form.source_price)).toFixed(2)} per unit
                    {form.source_price && ` (${(((parseFloat(form.selling_price) - parseFloat(form.source_price)) / parseFloat(form.source_price)) * 100).toFixed(0)}% margin)`}
                  </p>
                </div>
              )}
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
                <input value={newFeature} onChange={e => setNewFeature(e.target.value)} placeholder="Add a feature..." onKeyDown={e => { if (e.key === 'Enter' && newFeature.trim()) { set('key_features', [...form.key_features, newFeature.trim()]); setNewFeature('') } }} className="flex-1 border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:bg-white outline-none" />
                <button
                  onClick={() => { if (newFeature.trim()) { set('key_features', [...form.key_features, newFeature.trim()]); setNewFeature('') } }}
                  aria-label="Add feature"
                  title="Add feature"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-xl transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="col-span-2 space-y-5">
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
                <input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="Or paste image URL..." onKeyDown={e => { if (e.key === 'Enter') addImageUrl(newImageUrl) }} className="flex-1 border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-xs bg-gray-50 focus:bg-white outline-none" />
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
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-4">Stock Status</h2>
              <div className="flex gap-2 mb-3">
                {(['in_stock', 'out_of_stock'] as const).map(s => (
                  <button key={s} onClick={() => set('stock_status', s)} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${form.stock_status === s ? 'bg-brand-400 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {s === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                  </button>
                ))}
              </div>
              <input type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="Quantity" className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-1">Options</h2>
              {[
                { key: 'is_featured', label: 'Featured product', desc: 'Show on homepage featured section' },
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
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
