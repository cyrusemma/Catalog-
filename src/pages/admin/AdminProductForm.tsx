import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdminContext } from '../../hooks/useAdminContext'
import { 
  ArrowLeft, Loader2, Plus, X, ImagePlus, Upload, 
  ChevronLeft, ChevronRight, Eye, Sparkles, 
  Calculator, Maximize2, Check, Search, 
  AlertCircle, ShoppingBag
} from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase, supabaseUrl } from '../../lib/supabase'
import { slugify } from '../../lib/utils'
import { compressImage } from '../../lib/imageOptimization'
import { useCategoryTree, topLevelCategories, childCategories, findCategory } from '../../hooks/useProducts'
import {
  extensionForMime,
  isValidImageUrl,
  validateImageFile,
  validateProductForm,
} from '../../lib/productValidation'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

import ImageCropper from '../../components/admin/ImageCropper'
import type { ProductVariant } from '../../types'

interface FormData {
  title: string; brand: string; description: string
  parent_category_id: string; category_id: string
  selling_price: string; original_price: string; discount_percent: string
  stock: string; stock_status: 'in_stock' | 'few_units_left' | 'out_of_stock'
  images: string[]; key_features: string[]; sizes: string[]; colors: string[]
  variants: ProductVariant[]
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
  images: [], key_features: [], sizes: [], colors: [],
  variants: [],
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

const POPULAR_COLORS = ['Black', 'White', 'Red', 'Blue', 'Grey', 'Green', 'Gold', 'Silver', 'Yellow', 'Pink']
const POPULAR_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44']

const TABS = [
  { id: 'basic', label: 'Basic Info', desc: 'Title, brand, description', icon: Sparkles },
  { id: 'media', label: 'Media', desc: 'Product images', icon: ImagePlus },
  { id: 'pricing', label: 'Pricing & Stock', desc: 'Price, stock, flash sale', icon: Calculator },
  { id: 'variants', label: 'Variants', desc: 'Sizes and colors', icon: ShoppingBag },
  { id: 'settings', label: 'Settings', desc: 'Delivery and visibility', icon: Upload },
] as const

export default function AdminProductForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const duplicateId = searchParams.get('duplicate')
  const isEdit = id && id !== 'new' && !duplicateId
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState<FormData>(emptyForm)
  const [activeTab, setActiveTab] = useState<'basic' | 'media' | 'pricing' | 'variants' | 'settings'>('basic')

  // Premium Mobile UI states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isEditorExpanded, setIsEditorExpanded] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [subCategorySearch, setSubCategorySearch] = useState('')
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false)
  const [isSubCategoryDrawerOpen, setIsSubCategoryDrawerOpen] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const currentTabIdx = TABS.findIndex(t => t.id === activeTab)
  const handleNextTab = () => {
    if (currentTabIdx < TABS.length - 1) {
      setActiveTab(TABS[currentTabIdx + 1].id)
    }
  }
  const handlePrevTab = () => {
    if (currentTabIdx > 0) {
      setActiveTab(TABS[currentTabIdx - 1].id)
    }
  }

  const isTabCompleted = (tabId: typeof TABS[number]['id']) => {
    switch (tabId) {
      case 'basic':
        return !!form.title.trim()
      case 'media':
        return form.images.length > 0
      case 'pricing':
        return !!form.selling_price.trim()
      case 'variants':
        return form.sizes.length > 0 || form.colors.length > 0
      case 'settings':
        return form.free_delivery || !!form.delivery_fee.trim()
      default:
        return false
    }
  }

  // Unsaved changes warning
  useEffect(() => {
    const isDirty = JSON.stringify(form) !== JSON.stringify(emptyForm)
    if (!isDirty) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [form])

  const { data: context } = useAdminContext()
  const [newFeature, setNewFeature] = useState('')
  const [newSize, setNewSize] = useState('')
  const [newColor, setNewColor] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
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

  const proceedWithUpload = async (fileToUpload: Blob | File, _contentType: string) => {
    setUploading(true)
    setUploadError('')
    try {
      // 1. Compress the file client-side before sending to Supabase
      const compressedFile = await compressImage(fileToUpload)
      
      const ext = extensionForMime(compressedFile.type) || 'webp'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from('product-images').upload(path, compressedFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: compressedFile.type,
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
    queryKey: ['admin-product', isEdit ? id : duplicateId],
    queryFn: async () => {
      const targetId = isEdit ? id : duplicateId
      const { data, error } = await supabase.from('products').select('*').eq('id', targetId).single()
      if (error) throw error
      return data
    },
    enabled: !!(isEdit || duplicateId),
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
        colors: existingProduct.colors || [],
        variants: (existingProduct.variants && Array.isArray(existingProduct.variants)) ? existingProduct.variants : [],
        is_featured: duplicateId ? false : (existingProduct.is_featured || false),
        is_published: duplicateId ? false : (existingProduct.is_published || false),
        is_preorder: existingProduct.is_preorder || false,
        free_delivery: !existingProduct.delivery_fee || Number(existingProduct.delivery_fee) === 0,
        delivery_fee: existingProduct.delivery_fee && Number(existingProduct.delivery_fee) > 0
          ? Number(existingProduct.delivery_fee).toString()
          : '',
        flash_sale_price: duplicateId ? '' : (existingProduct.flash_sale_price != null
          ? Number(existingProduct.flash_sale_price).toString()
          : ''),
        flash_sale_ends_at: duplicateId ? '' : isoToLocalInput(existingProduct.flash_sale_ends_at),
      })
    }
  }, [existingProduct, categoryTree, duplicateId])

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

  const applyQuickDiscount = (pct: number) => {
    const orig = parseFloat(form.original_price)
    if (orig > 0) {
      const sell = Math.round(orig * (1 - pct / 100) * 100) / 100
      setForm(f => ({
        ...f,
        selling_price: sell.toString(),
        discount_percent: pct.toString(),
      }))
      toast.success(`Applied ${pct}% discount!`)
    } else {
      toast.error('Set Compare-at Price first to calculate discount.')
    }
  }

  const adjustPrice = (amount: number) => {
    const current = parseFloat(form.selling_price) || 0
    const nextVal = Math.max(0, current + amount)
    setForm(f => {
      const next = { ...f, selling_price: nextVal.toString() }
      const sell = parseFloat(next.selling_price)
      const orig = parseFloat(next.original_price)
      if (next.selling_price && next.original_price && orig > 0 && sell > 0 && sell < orig) {
        next.discount_percent = Math.round(((orig - sell) / orig) * 100).toString()
      } else if (!next.original_price || !next.selling_price) {
        next.discount_percent = ''
      }
      return next
    })
  }

  const handleSave = async (publish = false) => {
    setSaveError('')
    setValidationErrors({})
    const validationError = validateProductForm(form, { publishing: publish })
    if (validationError) {
      setSaveError(validationError)
      toast.error(validationError, { icon: <AlertCircle className="text-red-500" size={16} /> })
      
      // Target specific fields
      const newErrs: Record<string, string> = {}
      let targetFieldId = ''
      
      if (validationError.toLowerCase().includes('title')) {
        newErrs.title = validationError
        targetFieldId = 'title-input-field'
        setActiveTab('basic')
      } else if (validationError.toLowerCase().includes('selling price')) {
        newErrs.selling_price = validationError
        targetFieldId = 'selling-price-field'
        setActiveTab('pricing')
      } else if (validationError.toLowerCase().includes('original price')) {
        newErrs.original_price = validationError
        targetFieldId = 'compare-price-field'
        setActiveTab('pricing')
      } else if (validationError.toLowerCase().includes('discount')) {
        newErrs.discount_percent = validationError
        targetFieldId = 'discount-field'
        setActiveTab('pricing')
      } else if (validationError.toLowerCase().includes('stock')) {
        newErrs.stock = validationError
        targetFieldId = 'stock-field'
        setActiveTab('pricing')
      } else if (validationError.toLowerCase().includes('image')) {
        newErrs.images = validationError
        targetFieldId = 'media-section'
        setActiveTab('media')
      }
      
      setValidationErrors(newErrs)
      
      if (targetFieldId) {
        setTimeout(() => {
          const el = document.getElementById(targetFieldId)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            el.focus()
          }
        }, 150)
      }
      return
    }

    setSaving(true)
    try {
      const slug = await resolveUniqueSlug(form.title, isEdit ? id : undefined)

      let resolvedSellingPrice = parseFloat(form.selling_price) || 0
      if (resolvedSellingPrice === 0 && form.variants && form.variants.length > 0) {
        const variantPrices = form.variants.map(v => Number(v.price) || 0).filter(p => p > 0)
        if (variantPrices.length > 0) {
          resolvedSellingPrice = Math.min(...variantPrices)
        }
      }

      const payload = {
        title: form.title.trim(),
        slug,
        brand: form.brand.trim() || null,
        category_id: form.category_id || form.parent_category_id || null,
        category: findCategory(categoryTree, form.category_id || form.parent_category_id)?.name || null,
        description: form.description.trim() || null,
        selling_price: resolvedSellingPrice,
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        discount_percent: form.discount_percent ? parseInt(form.discount_percent, 10) : null,
        stock: parseInt(form.stock, 10) || 0,
        stock_status: form.stock_status,
        images: form.images,
        key_features: form.key_features,
        sizes: form.sizes,
        colors: form.colors,
        variants: form.variants || [],
        is_featured: form.is_featured,
        is_published: publish ? true : form.is_published,
        is_preorder: form.is_preorder,
        source_url: null,
        source_price: null,
        delivery_fee: form.free_delivery ? 0 : (parseFloat(form.delivery_fee) || 0),
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

      let savedProductId = id
      if (isEdit) {
        const { error } = await supabase.from('products').update(dbPayload).eq('id', id!)
        if (error) throw error
        toast.success('Product updated successfully!')
      } else {
        const { data, error } = await supabase.from('products').insert(dbPayload).select('id').single()
        if (error) throw error
        savedProductId = data.id
        toast.success('Product added successfully!')
      }

      // Automatically notify subscribers if this is a newly published product
      const wasPublished = existingProduct?.is_published
      const isNowPublished = publish ? true : form.is_published
      if (!wasPublished && isNowPublished && savedProductId) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            await fetch(`${supabaseUrl}/functions/v1/notify-new-arrival`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ product_id: savedProductId }),
            })
          }
        } catch (err) {
          console.error('Failed to notify subscribers:', err)
        }
      }

      await qc.invalidateQueries({ queryKey: ['admin-products'] })
      await qc.invalidateQueries({ queryKey: ['products'] })
      navigate('/admin/products')
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to save product'
      setSaveError(errMsg)
      toast.error(errMsg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="p-3 sm:p-6 lg:p-8 w-full max-w-4xl overflow-x-hidden pb-32 lg:pb-8">
        <div className="flex items-center justify-between gap-3 mb-5 lg:mb-8">
          <div className="flex items-center gap-3">
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
          
          {/* Mobile Preview Toggle */}
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="lg:hidden px-3.5 py-2 bg-brand-50 hover:bg-brand-100 text-brand-500 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-brand-100"
          >
            <Eye size={14} />
            <span>Preview</span>
          </button>
        </div>

        <div className="grid lg:grid-cols-4 gap-4 lg:gap-8">
          <div className="lg:col-span-3 space-y-4 min-w-0">
            {/* Desktop and Mobile Stepper / Tab Navigation */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              {/* Mobile Quick Stepper View */}
              <div className="lg:hidden flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center font-bold text-xs">
                    {currentTabIdx + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-xs text-gray-900">{TABS[currentTabIdx].label}</h3>
                    <p className="text-[10px] text-gray-400">{TABS[currentTabIdx].desc}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {Math.round(((currentTabIdx + 1) / TABS.length) * 100)}%
                </span>
              </div>
              
              {/* Progress Line */}
              <div className="lg:hidden w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-4">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentTabIdx + 1) / TABS.length) * 100}%` }}
                  className="h-full bg-gradient-to-r from-brand-400 to-brand-500 rounded-full"
                />
              </div>

              {/* Scrollable Step list */}
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1" style={{WebkitOverflowScrolling: 'touch'}}>
                {TABS.map((tab) => {
                  const TabIcon = tab.icon
                  const isActive = activeTab === tab.id
                  const isDone = isTabCompleted(tab.id)
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all border flex-shrink-0 ${
                        isActive
                          ? 'bg-brand-400 text-white border-brand-400 shadow-md shadow-brand-400/20'
                          : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'
                      }`}
                    >
                      <TabIcon size={13} className={isActive ? 'text-white' : 'text-gray-400'} />
                      <span>{tab.label}</span>
                      {isDone && (
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] flex-shrink-0 ${isActive ? 'bg-white text-brand-500' : 'bg-green-100 text-green-600'}`}>
                          <Check size={7} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'media' && (
            <div id="media-section" className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
              <div>
                <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-1">Product Images</h2>
                <p className="text-gray-400 text-xs">Upload high-quality images. The first image will be your product's main catalog cover.</p>
              </div>

              {/* Upload Drag & Drop Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-brand-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-brand-50/5 flex flex-col items-center justify-center min-h-[140px]"
              >
                <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-400 flex items-center justify-center mb-3">
                  <ImagePlus size={22} />
                </div>
                <p className="text-sm font-semibold text-gray-700">Click to upload files</p>
                <p className="text-[11px] text-gray-400 mt-1">PNG, JPG, WebP up to 5MB</p>
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

              {uploadError && (
                <div className="flex items-center gap-2 text-red-500 text-xs bg-red-50 border border-red-100 p-3 rounded-xl">
                  <AlertCircle size={14} />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Uploaded Images Grid */}
              {form.images.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-gray-700 text-xs font-semibold uppercase tracking-wide">Uploaded Images ({form.images.length})</label>
                  <div className="grid grid-cols-3 gap-3">
                    {form.images.map((img, i) => (
                      <div key={i} className="relative aspect-square group rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        
                        {/* Cover badge on first image */}
                        {i === 0 && (
                          <div className="absolute top-1.5 left-1.5 bg-brand-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                            <Sparkles size={8} />
                            <span>Cover</span>
                          </div>
                        )}

                        {/* Reorder/Delete actions. For mobile, they are always visible overlay. */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              set('images', form.images.filter((_, j) => j !== i));
                            }}
                            aria-label={`Remove image ${i + 1}`}
                            className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {uploading && (
                      <div className="aspect-square bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-200 animate-pulse">
                        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* URL fallback option */}
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-gray-600 text-xs font-medium mb-1.5">Or Add Image via URL</label>
                <div className="flex gap-2">
                  <input
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    placeholder="Paste public image address (https://...)"
                    onKeyDown={e => { if (e.key === 'Enter') addImageUrl(newImageUrl) }}
                    className="flex-1 border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white outline-none"
                  />
                  <button
                    onClick={() => addImageUrl(newImageUrl)}
                    type="button"
                    aria-label="Add image from URL"
                    title="Add image from URL"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 rounded-xl transition-colors flex items-center justify-center"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
            )}

            {activeTab === 'basic' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-4">Product Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1.5 uppercase tracking-wide">
                    Product Title *
                  </label>
                  <textarea 
                    id="title-input-field"
                    value={form.title} 
                    onChange={e => set('title', e.target.value)} 
                    placeholder="Enter product title" 
                    rows={2} 
                    className={`w-full border ${validationErrors.title ? 'border-red-500 bg-red-50/10 focus:border-red-500' : 'border-gray-200 focus:border-brand-400'} rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white resize-y`} 
                  />
                </div>

                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Brand</label>
                  <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Samsung" className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white" />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Category Drawer Trigger */}
                  <div>
                    <label className="block text-gray-600 text-xs font-semibold mb-1.5 uppercase tracking-wide">Category</label>
                    <button
                      type="button"
                      onClick={() => { setIsCategoryDrawerOpen(true); setCategorySearch('') }}
                      className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-3 text-left text-sm bg-gray-50 hover:bg-gray-100/50 transition-colors flex items-center justify-between text-gray-900"
                    >
                      <span className="truncate">
                        {findCategory(categoryTree, form.parent_category_id)?.name || 'Select category'}
                      </span>
                      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                    </button>
                  </div>

                  {/* Sub-category Drawer Trigger */}
                  <div>
                    <label className="block text-gray-600 text-xs font-semibold mb-1.5 uppercase tracking-wide">Sub-category</label>
                    <button
                      type="button"
                      disabled={!form.parent_category_id}
                      onClick={() => { setIsSubCategoryDrawerOpen(true); setSubCategorySearch('') }}
                      className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-3 text-left text-sm bg-gray-50 hover:bg-gray-100/50 disabled:opacity-50 transition-colors flex items-center justify-between text-gray-900"
                    >
                      <span className="truncate">
                        {form.parent_category_id
                          ? findCategory(categoryTree, form.category_id)?.name || 'Optional — parent only'
                          : 'Select category first'}
                      </span>
                      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                    </button>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-gray-600 text-xs font-medium">Description</label>
                    <button
                      type="button"
                      onClick={() => setIsEditorExpanded(true)}
                      className="text-brand-400 text-xs font-semibold flex items-center gap-1 hover:text-brand-500"
                    >
                      <Maximize2 size={12} />
                      <span>Fullscreen</span>
                    </button>
                  </div>
                  <div className="bg-white rounded-xl overflow-hidden border border-gray-200 focus-within:border-brand-400">
                    <ReactQuill
                      theme="snow"
                      value={form.description}
                      onChange={val => set('description', val)}
                      className="border-none"
                    />
                  </div>
                </div>
              </div>
            </div>
            )}

            {activeTab === 'basic' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-5">
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
            )}

            {activeTab === 'pricing' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">Pricing</h2>
                {form.variants.length > 0 && (
                  <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100/40">
                    {form.variants.length} Priced Variants Active
                  </span>
                )}
              </div>

              {form.variants.length > 0 && (
                <div className="p-3 rounded-xl bg-brand-50/70 border border-brand-200/50 text-xs text-brand-900">
                  <p className="font-medium">
                    ✨ You have created <strong>{form.variants.length} priced variations</strong> in the Variants tab. The base selling price will automatically default to your lowest variant option if left blank.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1.5 uppercase tracking-wide">Selling Price (GHS) *</label>
                  <input 
                    id="selling-price-field"
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={form.selling_price} 
                    onChange={e => setPrice('selling_price', e.target.value)} 
                    placeholder="0.00" 
                    className={`w-full border ${validationErrors.selling_price ? 'border-red-500 bg-red-50/10 focus:border-red-500' : 'border-gray-200 focus:border-brand-400'} rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white`} 
                  />
                  
                  {/* Quick Adjust buttons */}
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Quick Adjust</p>
                    <div className="flex gap-1 flex-wrap">
                      {[-50, -10, -5, +5, +10, +50].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => adjustPrice(amt)}
                          className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold"
                        >
                          {amt > 0 ? `+${amt}` : amt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Compare-at Price (GHS)</label>
                  <input 
                    id="compare-price-field"
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={form.original_price} 
                    onChange={e => setPrice('original_price', e.target.value)} 
                    placeholder="0.00" 
                    className={`w-full border ${validationErrors.original_price ? 'border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-brand-400'} rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white`} 
                  />

                  {/* Discount Preset buttons */}
                  {form.original_price && parseFloat(form.original_price) > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Quick Discount</p>
                      <div className="flex gap-1 flex-wrap">
                        {[10, 20, 30, 50, 70].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => applyQuickDiscount(pct)}
                            className="px-2 py-0.5 bg-brand-50 hover:bg-brand-100 text-brand-600 border border-brand-100/40 rounded-lg text-[10px] font-semibold"
                          >
                            {pct}% Off
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-gray-600 text-xs font-medium mb-1.5">Discount % (auto)</label>
                  <input 
                    id="discount-field"
                    type="number" 
                    readOnly 
                    value={form.discount_percent} 
                    placeholder="—" 
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-100 cursor-not-allowed" 
                  />
                </div>
              </div>
              <p className="text-gray-400 text-xs">
                Compare-at price shows as a strikethrough next to your selling price to highlight savings.
              </p>
            </div>
            )}

            {activeTab === 'pricing' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-5">
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
                  <input 
                    id="stock-field"
                    type="number" 
                    min="0" 
                    value={form.stock} 
                    onChange={e => set('stock', e.target.value)} 
                    placeholder="e.g. 3" 
                    className={`w-full border ${validationErrors.stock ? 'border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-brand-400'} rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white`} 
                  />
                  {form.stock_status === 'in_stock' && (
                    <p className="text-gray-400 text-[11px] mt-2">Pre-filled for you — adjust only if you want an exact count.</p>
                  )}
                </div>
              )}
            </div>
            )}

            {activeTab === 'pricing' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-5">
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
            )}

            {activeTab === 'variants' && (
            <div className="grid grid-cols-1 gap-5">
              {/* Priced Product Variations (e.g. 500GB @ 700 vs 1TB @ 900) */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                      <ShoppingBag size={18} className="text-brand-500" />
                      Priced Variations & Storage Options
                    </h2>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Configure different capacities, models, or colors with their own prices and photos (e.g. 500GB @ GH₵ 700 vs 1TB @ GH₵ 900).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newV: ProductVariant = {
                        id: crypto.randomUUID(),
                        name: `Option ${form.variants.length + 1}`,
                        price: parseFloat(form.selling_price) || 0,
                        original_price: form.original_price ? parseFloat(form.original_price) : null,
                        image_url: form.images[0] || null,
                        stock: parseInt(form.stock, 10) || 10,
                      }
                      setForm(f => ({ ...f, variants: [...f.variants, newV] }))
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-semibold transition-colors"
                  >
                    <Plus size={14} weight="bold" /> Add Custom Variant
                  </button>
                </div>

                {/* Live Customer Price Range Banner */}
                {form.variants.length > 0 && (() => {
                  const prices = form.variants.map(v => Number(v.price) || 0).filter(p => p > 0)
                  const minP = prices.length > 0 ? Math.min(...prices) : 0
                  const maxP = prices.length > 0 ? Math.max(...prices) : 0
                  const isRanged = prices.length > 1 && minP !== maxP
                  return (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-brand-400/10 to-amber-500/5 border border-brand-500/20 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🏷️</span>
                        <div>
                          <p className="text-xs font-bold text-gray-900">Customer Price Preview</p>
                          <p className="text-[11px] text-gray-500">
                            {isRanged
                              ? 'Customers will see a dynamic price range on product cards:'
                              : 'All variants currently share the same price:'}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-dark-800 px-3 py-1.5 rounded-lg border border-brand-500/30 shadow-sm">
                        <span className="text-sm font-extrabold text-brand-600 dark:text-brand-400">
                          {isRanged ? `GH₵ ${minP.toFixed(2)} – GH₵ ${maxP.toFixed(2)}` : `GH₵ ${minP.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  )
                })()}

                {/* Quick Storage Option Presets */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Add Storage Presets</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['128GB', '256GB', '512GB', '1TB', '2TB', '4TB'].map(preset => {
                      const exists = form.variants.some(v => v.name.toLowerCase() === preset.toLowerCase())
                      return (
                        <button
                          key={preset}
                          type="button"
                          disabled={exists}
                          onClick={() => {
                            const newV: ProductVariant = {
                              id: crypto.randomUUID(),
                              name: preset,
                              price: parseFloat(form.selling_price) || 0,
                              original_price: form.original_price ? parseFloat(form.original_price) : null,
                              image_url: form.images[0] || null,
                              stock: parseInt(form.stock, 10) || 10,
                            }
                            setForm(f => ({ ...f, variants: [...f.variants, newV] }))
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                            exists
                              ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed'
                              : 'bg-white hover:bg-brand-50 text-gray-700 hover:text-brand-600 border-gray-200 hover:border-brand-200'
                          }`}
                        >
                          + {preset}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Variant rows list */}
                {form.variants.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    {form.variants.map((v, index) => (
                      <div
                        key={v.id}
                        className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white transition-all space-y-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-xs">
                            Variation #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, variants: f.variants.filter(item => item.id !== v.id) }))}
                            className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                            title="Remove variation"
                          >
                            <Trash size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {/* Option Name */}
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                              Option Name / Spec *
                            </label>
                            <input
                              value={v.name}
                              onChange={e => {
                                const name = e.target.value
                                setForm(f => ({
                                  ...f,
                                  variants: f.variants.map(item => item.id === v.id ? { ...item, name } : item),
                                }))
                              }}
                              placeholder="e.g. 500GB or Blue / 1TB"
                              className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-xs text-gray-900 bg-white outline-none"
                            />
                          </div>

                          {/* Price */}
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                              Price (GH₵) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={v.price || ''}
                              onChange={e => {
                                const price = parseFloat(e.target.value) || 0
                                setForm(f => ({
                                  ...f,
                                  variants: f.variants.map(item => item.id === v.id ? { ...item, price } : item),
                                }))
                              }}
                              placeholder="e.g. 700"
                              className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-xs text-gray-900 bg-white outline-none font-bold"
                            />
                          </div>

                          {/* Compare-at Price */}
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                              Original Price (GH₵)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={v.original_price || ''}
                              onChange={e => {
                                const original_price = e.target.value ? parseFloat(e.target.value) : null
                                setForm(f => ({
                                  ...f,
                                  variants: f.variants.map(item => item.id === v.id ? { ...item, original_price } : item),
                                }))
                              }}
                              placeholder="Optional strike price"
                              className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-xs text-gray-900 bg-white outline-none"
                            />
                          </div>

                          {/* Image Selection */}
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                              Variant Image
                            </label>
                            <div className="flex items-center gap-2">
                              {v.image_url ? (
                                <img
                                  src={v.image_url}
                                  alt={v.name}
                                  className="w-8 h-8 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-[10px] flex-shrink-0">
                                  None
                                </div>
                              )}
                              <select
                                value={v.image_url || ''}
                                onChange={e => {
                                  const image_url = e.target.value || null
                                  setForm(f => ({
                                    ...f,
                                    variants: f.variants.map(item => item.id === v.id ? { ...item, image_url } : item),
                                  }))
                                }}
                                className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-2 py-2 text-xs text-gray-900 bg-white outline-none"
                              >
                                <option value="">Default Image</option>
                                {form.images.map((img, imgIdx) => (
                                  <option key={imgIdx} value={img}>
                                    Photo #{imgIdx + 1}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <p className="text-xs text-gray-500 mb-2">No priced variations created yet.</p>
                    <p className="text-[11px] text-gray-400 max-w-sm mx-auto mb-3">
                      If this product comes in different storage sizes or tiers, click below to add them with custom prices.
                    </p>
                  </div>
                )}
              </div>

              {/* Sizes Container */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                <div>
                  <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-1">Available Sizes (Tags)</h2>
                  <p className="text-gray-400 text-[11px]">
                    Specify sizes/variants customers can select (e.g. S, M, L or shoe sizes).
                  </p>
                </div>

                {/* Popular Size Suggestions */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Add Sizes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SIZES.map(s => {
                      const isSelected = form.sizes.includes(s)
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={isSelected}
                          onClick={() => set('sizes', [...form.sizes, s])}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-all border ${
                            isSelected 
                              ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed'
                              : 'bg-brand-50 hover:bg-brand-100 text-brand-600 border-brand-100/30'
                          }`}
                        >
                          +{s}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Selected Sizes Chips */}
                {form.sizes.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl">
                    {form.sizes.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-white text-gray-700 text-xs rounded-full pl-3 pr-1 py-1 border border-gray-100 shadow-sm">
                        {s}
                        <button
                          type="button"
                          onClick={() => set('sizes', form.sizes.filter((_, j) => j !== i))}
                          aria-label={`Remove size ${s}`}
                          className="w-5 h-5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    value={newSize}
                    onChange={e => setNewSize(e.target.value)}
                    placeholder="Custom size..."
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newSize.trim()) {
                        e.preventDefault()
                        const val = newSize.trim()
                        if (!form.sizes.includes(val)) set('sizes', [...form.sizes, val])
                        setNewSize('')
                      }
                    }}
                    className="flex-1 border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white outline-none"
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

              {/* Colors Container */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                <div>
                  <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400 mb-1">Available Colors (Tags)</h2>
                  <p className="text-gray-400 text-[11px]">
                    Specify product colors customers can select (e.g. Red, Black).
                  </p>
                </div>

                {/* Popular Color Suggestions */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Add Colors</p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_COLORS.map(c => {
                      const isSelected = form.colors.includes(c)
                      return (
                        <button
                          key={c}
                          type="button"
                          disabled={isSelected}
                          onClick={() => set('colors', [...form.colors, c])}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-all border ${
                            isSelected 
                              ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed'
                              : 'bg-brand-50 hover:bg-brand-100 text-brand-600 border-brand-100/30'
                          }`}
                        >
                          +{c}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Selected Colors Chips */}
                {form.colors.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl">
                    {form.colors.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-white text-gray-700 text-xs rounded-full pl-3 pr-1 py-1 border border-gray-100 shadow-sm">
                        {c}
                        <button
                          type="button"
                          onClick={() => set('colors', form.colors.filter((_, j) => j !== i))}
                          aria-label={`Remove color ${c}`}
                          className="w-5 h-5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    value={newColor}
                    onChange={e => setNewColor(e.target.value)}
                    placeholder="Custom color..."
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newColor.trim()) {
                        e.preventDefault()
                        const val = newColor.trim()
                        if (!form.colors.includes(val)) set('colors', [...form.colors, val])
                        setNewColor('')
                      }
                    }}
                    className="flex-1 border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = newColor.trim()
                      if (val && !form.colors.includes(val)) set('colors', [...form.colors, val])
                      setNewColor('')
                    }}
                    aria-label="Add color"
                    title="Add color"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-xl transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
            )}

            {activeTab === 'settings' && (
            <div className="space-y-5">
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
            </div>
            )}
            
            {/* Step Navigation Actions */}
            <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-100 mt-6">
              <button
                type="button"
                onClick={handlePrevTab}
                disabled={currentTabIdx === 0}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>
              {currentTabIdx < TABS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextTab}
                  className="px-4 py-2.5 bg-brand-400 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>Next Step</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <span className="text-[11px] font-medium text-gray-400">Final Step</span>
              )}
            </div>
          </div>

          {/* Sidebar / Sticky Actions */}
          <div className="lg:col-span-1">
            <div className="fixed bottom-0 left-0 right-0 z-40 lg:relative lg:bottom-auto lg:left-auto lg:right-auto lg:z-auto">
              <div className="bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.06)] lg:bg-transparent lg:border-0 lg:shadow-none p-3 sm:p-4 lg:p-0 space-y-2">
                {saveError && (
                  <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">{saveError}</p>
                )}
                <div className="flex gap-2 lg:flex-col">
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving || !form.title || !form.selling_price}
                    className="flex-1 bg-brand-400 hover:bg-brand-500 active:scale-95 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 min-w-0"
                  >
                    {saving ? <><Loader2 size={16} className="animate-spin flex-shrink-0" /><span>Saving...</span></> : <span className="truncate">Save &amp; Publish</span>}
                  </button>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving || !form.title}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 active:scale-95 disabled:opacity-50 text-gray-700 font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 min-w-0"
                  >
                    {saving ? <><Loader2 size={16} className="animate-spin flex-shrink-0" /><span>Saving...</span></> : <span className="truncate">Save as Draft</span>}
                  </button>
                </div>
              </div>
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

      {/* Fullscreen Rich Editor Modal */}
      <AnimatePresence>
        {isEditorExpanded && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-sm text-gray-900">Product Description</h3>
              <button
                type="button"
                onClick={() => setIsEditorExpanded(false)}
                className="px-3.5 py-1.5 bg-brand-400 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
            
            {/* Quill Editor Container */}
            <div className="flex-1 overflow-y-auto p-4 pb-20">
              <ReactQuill
                theme="snow"
                value={form.description}
                onChange={val => set('description', val)}
                className="h-full min-h-[300px] border-none"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Live Storefront Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <Eye size={16} className="text-brand-400" />
                  Storefront Preview
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-5 flex flex-col items-center">
                {/* Store Catalog Card Layout Replica */}
                <div className="w-[240px] bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-md flex flex-col">
                  <div className="relative aspect-square bg-gray-50 w-full overflow-hidden">
                    {form.images[0] ? (
                      <img src={form.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-1.5">
                        <ImagePlus size={32} />
                        <span className="text-[10px]">No image uploaded</span>
                      </div>
                    )}
                    
                    {/* Discount badge */}
                    {form.discount_percent && parseInt(form.discount_percent) > 0 && (
                      <div className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-lg shadow-sm">
                        -{form.discount_percent}%
                      </div>
                    )}

                    {/* Preorder badge */}
                    {form.is_preorder && (
                      <div className="absolute top-2.5 right-2.5 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">
                        Preorder
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      {form.brand && (
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{form.brand}</p>
                      )}
                      <h4 className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight min-h-[32px]">
                        {form.title.trim() || 'Untitled Product'}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900">
                          GHS {parseFloat(form.selling_price || '0').toFixed(2)}
                        </span>
                        {form.original_price && parseFloat(form.original_price) > parseFloat(form.selling_price || '0') && (
                          <span className="text-[10px] text-gray-400 line-through">
                            GHS {parseFloat(form.original_price).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Delivery badge */}
                      {form.free_delivery && (
                        <span className="text-[9px] font-extrabold bg-green-50 text-green-600 px-1.5 py-0.5 rounded-md border border-green-100">
                          Free Del.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-gray-400 mt-4 text-center">
                  This shows how the product is represented in your store catalog cards.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Selection Drawer */}
      <AnimatePresence>
        {isCategoryDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white rounded-t-3xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Select Category</h3>
                  <p className="text-[10px] text-gray-400">Choose a top-level parent category</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCategoryDrawerOpen(false)}
                  className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Search Category */}
              <div className="p-4 border-b border-gray-50">
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={e => setCategorySearch(e.target.value)}
                    placeholder="Search categories..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 focus:border-brand-400 rounded-xl text-xs outline-none bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
                {parents
                  .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                  .map(c => {
                    const isSelected = form.parent_category_id === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, parent_category_id: c.id, category_id: '' }))
                          setIsCategoryDrawerOpen(false)
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-medium transition-all border ${
                          isSelected
                            ? 'bg-brand-50 text-brand-600 border-brand-100 shadow-sm'
                            : 'hover:bg-gray-50 border-transparent text-gray-700'
                        }`}
                      >
                        <span>{c.name}</span>
                        {isSelected && <Check size={14} className="text-brand-500" />}
                      </button>
                    )
                  })}
                  
                {parents.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-6">No matching categories found</p>
                )}
              </div>

              {/* Add New Parent Category option */}
              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryDrawerOpen(false)
                    setCreatingCategory('parent')
                    setNewCategoryName('')
                    setCategoryError('')
                  }}
                  className="w-full bg-brand-400 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-colors text-xs flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Create New Category</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subcategory Selection Drawer */}
      <AnimatePresence>
        {isSubCategoryDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white rounded-t-3xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Select Sub-category</h3>
                  <p className="text-[10px] text-gray-400">Choose a subcategory under {findCategory(categoryTree, form.parent_category_id)?.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSubCategoryDrawerOpen(false)}
                  className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Search Subcategory */}
              <div className="p-4 border-b border-gray-50">
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={subCategorySearch}
                    onChange={e => setSubCategorySearch(e.target.value)}
                    placeholder="Search sub-categories..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 focus:border-brand-400 rounded-xl text-xs outline-none bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    set('category_id', '')
                    setIsSubCategoryDrawerOpen(false)
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-medium transition-all border ${
                    !form.category_id
                      ? 'bg-brand-50 text-brand-600 border-brand-100'
                      : 'hover:bg-gray-50 border-transparent text-gray-700'
                  }`}
                >
                  <span>None — Parent Category Only</span>
                  {!form.category_id && <Check size={14} className="text-brand-500" />}
                </button>

                {subs
                  .filter(c => c.name.toLowerCase().includes(subCategorySearch.toLowerCase()))
                  .map(c => {
                    const isSelected = form.category_id === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          set('category_id', c.id)
                          setIsSubCategoryDrawerOpen(false)
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-medium transition-all border ${
                          isSelected
                            ? 'bg-brand-50 text-brand-600 border-brand-100 shadow-sm'
                            : 'hover:bg-gray-50 border-transparent text-gray-700'
                        }`}
                      >
                        <span>{c.name}</span>
                        {isSelected && <Check size={14} className="text-brand-500" />}
                      </button>
                    )
                  })}
                  
                {subs.filter(c => c.name.toLowerCase().includes(subCategorySearch.toLowerCase())).length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-6">No matching sub-categories found</p>
                )}
              </div>

              {/* Add New Sub-Category option */}
              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubCategoryDrawerOpen(false)
                    setCreatingCategory('sub')
                    setNewCategoryName('')
                    setCategoryError('')
                  }}
                  className="w-full bg-brand-400 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-colors text-xs flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Create New Sub-category</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
