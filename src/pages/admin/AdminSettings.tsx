import { useState, useEffect, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAdminContext } from "../../hooks/useAdminContext"
import { Save, CheckCircle, Upload, X, Image as ImageIcon, Loader2, AlertTriangle, Store, Palette, MessageCircle, ShoppingBag, Sliders, Settings2, Trash } from "lucide-react"
import AdminLayout from "../../components/admin/AdminLayout"
import { supabase } from "../../lib/supabase"
import { extensionForMime, isValidImageUrl, validateImageFile } from "../../lib/productValidation"
import { compressImage } from "../../lib/imageOptimization"
import { formatPhoneNumber } from "../../lib/utils"
import { toast } from "sonner"
import { getActiveSubscription, pushIsSupported, subscribeToPush, unsubscribeFromPush } from "../../lib/pushSubscription"

const CURRENCIES = [
  { code: "GHS", label: "GHS - Ghanaian Cedi" },
  { code: "USD", label: "USD - US Dollar" },
  { code: "EUR", label: "EUR - Euro" },
  { code: "GBP", label: "GBP - British Pound" },
  { code: "NGN", label: "NGN - Nigerian Naira" },
  { code: "KES", label: "KES - Kenyan Shilling" },
  { code: "ZAR", label: "ZAR - South African Rand" },
  { code: "XOF", label: "XOF - West African CFA" },
  { code: "EGP", label: "EGP - Egyptian Pound" },
  { code: "CAD", label: "CAD - Canadian Dollar" },
  { code: "AUD", label: "AUD - Australian Dollar" },
]

interface SettingsForm {
  store_name: string
  tagline: string
  whatsapp_number: string
  currency: string
  hero_images: string[]
  hero_rotation_seconds: string
  announcement_text: string
  announcement_active: boolean
  announcement_link: string
  social_instagram: string
  social_tiktok: string
  social_facebook: string
  social_twitter: string
  logo_url: string
  whatsapp_template: string
  show_visitor_count: boolean
  minimum_order_amount: string
  maintenance_mode: boolean
  maintenance_message: string
  operating_hours: string
  payment_methods: string[]
  seo_meta_title: string
  seo_meta_description: string
  seo_og_image: string
  analytics_google_id: string
  analytics_pixel_id: string
  order_auto_cancel_hours: string
  urgent_banner_active: boolean
  urgent_banner_text: string
  theme_color: string
  markup_percentage: string
}

const emptyForm: SettingsForm = {
  store_name: "Catalog by Cyrus",
  tagline: "Discover Amazing Products Brought to you By Cyrus",
  whatsapp_number: "",
  currency: "GHS",
  hero_images: [],
  hero_rotation_seconds: "6",
  announcement_text: "",
  announcement_active: false,
  announcement_link: "",
  social_instagram: "",
  social_tiktok: "",
  social_facebook: "",
  social_twitter: "",
  logo_url: "",
  whatsapp_template: "",
  show_visitor_count: false,
  minimum_order_amount: "0",
  maintenance_mode: false,
  maintenance_message: "We're currently updating our store. Check back soon!",
  operating_hours: "",
  payment_methods: ["momo", "cod"],
  seo_meta_title: "",
  seo_meta_description: "",
  seo_og_image: "",
  analytics_google_id: "",
  analytics_pixel_id: "",
  order_auto_cancel_hours: "0",
  urgent_banner_active: false,
  urgent_banner_text: "",
  theme_color: "amber",
  markup_percentage: "0",
}

function formFromSettings(s: any): SettingsForm {
  return {
    store_name: s.store_name || s.name || "",
    tagline: s.tagline || "",
    whatsapp_number: s.whatsapp_number || "",
    currency: s.currency || "GHS",
    hero_images: s.hero_images || [],
    hero_rotation_seconds: s.hero_rotation_seconds?.toString() || "6",
    announcement_text: s.announcement_text || "",
    announcement_active: s.announcement_active || false,
    announcement_link: s.announcement_link || "",
    social_instagram: s.social_instagram || "",
    social_tiktok: s.social_tiktok || "",
    social_facebook: s.social_facebook || "",
    social_twitter: s.social_twitter || "",
    logo_url: s.logo_url || "",
    whatsapp_template: s.whatsapp_template || "",
    show_visitor_count: s.show_visitor_count || false,
    minimum_order_amount: s.minimum_order_amount?.toString() || "0",
    maintenance_mode: s.maintenance_mode || false,
    maintenance_message: s.maintenance_message || "",
    operating_hours: s.operating_hours || "",
    payment_methods: s.payment_methods || ["momo", "cod"],
    seo_meta_title: s.seo_meta_title || "",
    seo_meta_description: s.seo_meta_description || "",
    seo_og_image: s.seo_og_image || "",
    analytics_google_id: s.analytics_google_id || "",
    analytics_pixel_id: s.analytics_pixel_id || "",
    order_auto_cancel_hours: s.order_auto_cancel_hours?.toString() || "0",
    urgent_banner_active: s.urgent_banner_active || false,
    urgent_banner_text: s.urgent_banner_text || "",
    theme_color: s.theme_color || "amber",
    markup_percentage: s.markup_percentage?.toString() || "0",
  }
}

type TabId = 'general' | 'branding' | 'contact' | 'checkout' | 'advanced'

export default function AdminSettings() {
  const [form, setForm] = useState<SettingsForm>(emptyForm)
  const [isDirty, setIsDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [uploadingHero, setUploadingHero] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [rotationError, setRotationError] = useState("")
  const heroInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = "" }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  const { data: context, isLoading: contextLoading } = useAdminContext()

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["store-settings", context?.storeId, context?.isAdmin],
    queryFn: async () => {
      if (context?.isAdmin) {
        const { data } = await supabase.from("store_settings").select("*").maybeSingle()
        return data ?? null
      } else if (context?.storeId) {
        const { data } = await supabase.from("stores").select("*").eq("id", context.storeId).single()
        return data ?? null
      }
      return null
    },
    enabled: !!context,
  })

  useEffect(() => {
    if (settingsLoading) return
    setForm(settings ? formFromSettings(settings) : emptyForm)
    setIsDirty(false)
  }, [settings, settingsLoading])

  const set = useCallback(<K extends keyof SettingsForm>(key: K, val: SettingsForm[K]) => {
    setForm(f => ({ ...f, [key]: val }))
    setIsDirty(true)
  }, [])

  const handlePhoneBlur = () => {
    const formatted = formatPhoneNumber(form.whatsapp_number)
    setForm(f => ({ ...f, whatsapp_number: formatted }))
  }

  const handleRotationChange = (v: string) => {
    set("hero_rotation_seconds", v)
    const n = parseInt(v, 10)
    if (!v || isNaN(n)) setRotationError("Enter a number between 2 and 60.")
    else if (n < 2) setRotationError("Minimum is 2 seconds.")
    else if (n > 60) setRotationError("Maximum is 60 seconds.")
    else setRotationError("")
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        currency: form.currency,
        hero_images: form.hero_images,
        hero_rotation_seconds: Math.max(2, Math.min(60, parseInt(form.hero_rotation_seconds, 10) || 6)),
        announcement_text: form.announcement_text || null,
        announcement_active: form.announcement_active,
        announcement_link: form.announcement_link || null,
        social_instagram: form.social_instagram || null,
        social_tiktok: form.social_tiktok || null,
        social_facebook: form.social_facebook || null,
        social_twitter: form.social_twitter || null,
        logo_url: form.logo_url || null,
        whatsapp_template: form.whatsapp_template || null,
        show_visitor_count: form.show_visitor_count,
        whatsapp_number: formatPhoneNumber(form.whatsapp_number),
        minimum_order_amount: parseFloat(form.minimum_order_amount) || 0,
        maintenance_mode: form.maintenance_mode,
        maintenance_message: form.maintenance_message || null,
        operating_hours: form.operating_hours || null,
        payment_methods: form.payment_methods,
        seo_meta_title: form.seo_meta_title || null,
        seo_meta_description: form.seo_meta_description || null,
        seo_og_image: form.seo_og_image || null,
        analytics_google_id: form.analytics_google_id || null,
        analytics_pixel_id: form.analytics_pixel_id || null,
        order_auto_cancel_hours: parseInt(form.order_auto_cancel_hours, 10) || 0,
        urgent_banner_active: form.urgent_banner_active,
        urgent_banner_text: form.urgent_banner_text || null,
        theme_color: form.theme_color,
        markup_percentage: parseFloat(form.markup_percentage) || 0,
      }
      if (context?.isAdmin) {
        const adminPayload = { ...payload, store_name: form.store_name, tagline: form.tagline }
        if (settings) {
          const { error } = await supabase.from("store_settings").update(adminPayload).eq("id", settings.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from("store_settings").insert(adminPayload)
          if (error) throw error
        }
      } else if (context?.storeId) {
        const merchantPayload = { ...payload, name: form.store_name, tagline: form.tagline }
        const { error } = await supabase.from("stores").update(merchantPayload).eq("id", context.storeId)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-settings"] })
      qc.invalidateQueries({ queryKey: ["store"] })
      toast.success("Settings saved successfully!")
      setSaved(true)
      setIsDirty(false)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err) => {
      console.error(err)
      toast.error("Failed to save settings. Please try again.")
    }
  })

  const uploadToBucket = async (file: File, prefix: string) => {
    const fileError = validateImageFile(file)
    if (fileError) throw new Error(fileError)
    const compressedFile = await compressImage(file)
    const ext = extensionForMime(compressedFile.type) || "webp"
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from("product-images").upload(path, compressedFile, {
      cacheControl: "3600", upsert: false, contentType: compressedFile.type,
    })
    if (error) throw error
    const { data } = supabase.storage.from("product-images").getPublicUrl(path)
    return data.publicUrl
  }

  const handleHeroUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploadingHero(true)
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) { uploaded.push(await uploadToBucket(file, "hero")) }
      set("hero_images", [...form.hero_images, ...uploaded])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploadingHero(false)
      if (heroInputRef.current) heroInputRef.current.value = ""
    }
  }

  const handleLogoUpload = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const url = await uploadToBucket(file, "logo")
      set("logo_url", url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ""
    }
  }

  const moveHero = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return
    const next = [...form.hero_images]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    set("hero_images", next)
  }

  const addHeroFromUrl = () => {
    const url = prompt("Paste image URL")?.trim()
    if (!url) return
    if (!isValidImageUrl(url)) { toast.error("URL must start with http:// or https://"); return }
    set("hero_images", [...form.hero_images, url])
  }

  const togglePaymentMethod = (method: string) => {
    set("payment_methods", form.payment_methods.includes(method) 
      ? form.payment_methods.filter(m => m !== method)
      : [...form.payment_methods, method])
  }

  if (contextLoading || (context && settingsLoading)) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Loader2 size={40} className="animate-spin text-brand-400" />
        </div>
      </AdminLayout>
    )
  }

  const isAdmin = context?.isAdmin ?? false

  const waPreview = (() => {
    const tpl = form.whatsapp_template.trim()
    if (!tpl) return null
    return tpl
      .replace("{items}", "* Blue Sneakers x1 - GHS 120\n* White Tee x2 - GHS 60")
      .replace("{subtotal}", "GHS 180")
      .replace("{delivery}", "GHS 15")
      .replace("{total}", "GHS 195")
      .replace("{currency}", form.currency || "GHS")
  })()

  const tabs = [
    { id: 'general', label: 'General', icon: <Store size={16} /> },
    { id: 'branding', label: 'Branding', icon: <Palette size={16} /> },
    { id: 'contact', label: 'Contact', icon: <MessageCircle size={16} /> },
    { id: 'checkout', label: 'Checkout', icon: <ShoppingBag size={16} /> },
    { id: 'advanced', label: 'Advanced', icon: <Sliders size={16} /> },
  ] as const

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl pb-32 lg:pb-10 mx-auto">
        
        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-gray-400 text-xs lg:text-sm mb-1 flex items-center gap-1.5"><Settings2 size={14}/> Settings</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Store Configuration</h1>
          </div>
          {isDirty && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-xl">
              <AlertTriangle size={14} />
              Unsaved changes
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 p-1 bg-gray-100 rounded-2xl border border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white text-brand-500 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Container */}
        <div className="space-y-6">

          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Basic Information</h2>
                  <p className="text-gray-500 text-sm mt-1">The core details that define your store.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Store Name" value={form.store_name} onChange={v => set("store_name", v)} placeholder="Catalog by Cyrus" />
                  <Field label="Tagline / Hero Text" value={form.tagline} onChange={v => set("tagline", v)} placeholder="Discover Amazing Products..." />
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1.5">Currency</label>
                    <select
                      aria-label="Currency"
                      value={form.currency}
                      onChange={e => set("currency", e.target.value)}
                      className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 outline-none text-sm bg-gray-50 focus:bg-white transition-colors"
                    >
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </div>
                  <Field label="Minimum Order Amount" value={form.minimum_order_amount} onChange={v => set("minimum_order_amount", v)} placeholder="0.00" type="number" />
                </div>
              </section>

              <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Operating Status</h2>
                  <p className="text-gray-500 text-sm mt-1">Control when your store is open for business.</p>
                </div>
                <Field label="Operating Hours" value={form.operating_hours} onChange={v => set("operating_hours", v)} placeholder="e.g. Mon-Fri: 9am - 5pm, Sat: 10am - 2pm" />
                
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mt-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-red-800 text-sm">Maintenance Mode</h3>
                      <p className="text-red-600/80 text-xs mt-0.5">Temporarily close the store to visitors.</p>
                    </div>
                    <ToggleSwitch checked={form.maintenance_mode} onChange={v => set("maintenance_mode", v)} />
                  </div>
                  {form.maintenance_mode && (
                    <Field label="Maintenance Message" value={form.maintenance_message} onChange={v => set("maintenance_message", v)} placeholder="We'll be back soon!" />
                  )}
                </div>
              </section>
            </div>
          )}

          {/* BRANDING TAB */}
          {activeTab === 'branding' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Theme & Logo</h2>
                  <p className="text-gray-500 text-sm mt-1">Customize the visual identity of your storefront.</p>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-3">Accent Color</label>
                  <div className="flex gap-3">
                    {[
                      { id: 'amber', color: 'bg-amber-500' },
                      { id: 'blue', color: 'bg-blue-500' },
                      { id: 'green', color: 'bg-green-500' },
                      { id: 'rose', color: 'bg-rose-500' },
                      { id: 'purple', color: 'bg-purple-500' },
                      { id: 'slate', color: 'bg-slate-800' },
                    ].map(theme => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => set("theme_color", theme.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${theme.color} ${form.theme_color === theme.id ? 'ring-4 ring-offset-2 ring-gray-200 scale-110' : 'hover:scale-110 opacity-80'}`}
                      >
                        {form.theme_color === theme.id && <CheckCircle size={16} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-3">Brand Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {form.logo_url ? <img src={form.logo_url} alt="Logo preview" className="w-full h-full object-contain" /> : <ImageIcon size={24} className="text-gray-300" />}
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <input ref={logoInputRef} type="file" aria-label="Brand Logo" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={e => handleLogoUpload(e.target.files)} className="hidden" />
                        <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="bg-brand-50 hover:bg-brand-100 text-brand-600 disabled:opacity-50 text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
                          {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                          {form.logo_url ? "Change Logo" : "Upload Logo"}
                        </button>
                        {form.logo_url && (
                          <button type="button" onClick={() => set("logo_url", "")} className="text-red-500 hover:bg-red-50 text-sm font-medium px-4 py-2 rounded-xl transition-colors">Remove</button>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs">Square or wide PNG/SVG. Max 2MB.</p>
                    </div>
                  </div>
                </div>
              </section>

              {isAdmin && (
                <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">Hero Carousel</h2>
                    <p className="text-gray-500 text-sm mt-1">Upload images for the home page slider. Drag to reorder.</p>
                  </div>
                  
                  {form.hero_images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {form.hero_images.map((img, i) => (
                        <div key={img + i} draggable onDragStart={() => setDraggedIdx(i)} onDragOver={e => e.preventDefault()} onDrop={() => { if (draggedIdx !== null) moveHero(draggedIdx, i); setDraggedIdx(null) }} onDragEnd={() => setDraggedIdx(null)} className={`relative aspect-square rounded-2xl overflow-hidden border-2 cursor-move group shadow-sm ${draggedIdx === i ? "border-brand-400 opacity-60" : "border-gray-100 hover:border-gray-300 transition-colors"}`}>
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-lg">#{i + 1}</div>
                          <button type="button" onClick={() => set("hero_images", form.hero_images.filter((_, j) => j !== i))} aria-label={`Remove hero image ${i + 1}`} className="absolute top-2 right-2 w-7 h-7 bg-white/90 text-red-500 hover:bg-red-500 hover:text-white transition-colors rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <input ref={heroInputRef} type="file" aria-label="Hero Images" accept="image/jpeg,image/png,image/webp" multiple onChange={e => handleHeroUpload(e.target.files)} className="hidden" />
                    <button type="button" onClick={() => heroInputRef.current?.click()} disabled={uploadingHero} className="bg-gray-900 hover:bg-black text-white disabled:opacity-50 text-sm font-medium px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors">
                      {uploadingHero ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {uploadingHero ? "Uploading..." : "Add Images"}
                    </button>
                    <button type="button" onClick={addHeroFromUrl} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">Paste URL</button>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <label className="block text-gray-700 text-sm font-medium mb-2">Rotation Interval (seconds)</label>
                    <input type="number" min="2" max="60" aria-label="Rotation Interval" value={form.hero_rotation_seconds} onChange={e => handleRotationChange(e.target.value)} className={`w-32 border rounded-xl px-4 py-2 text-gray-900 outline-none text-sm bg-gray-50 focus:bg-white transition-colors ${rotationError ? "border-red-400" : "border-gray-200 focus:border-brand-400"}`} />
                    {rotationError && <p className="text-red-500 text-xs mt-1">{rotationError}</p>}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* CONTACT & SOCIAL TAB */}
          {activeTab === 'contact' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">WhatsApp Settings</h2>
                  <p className="text-gray-500 text-sm mt-1">Configure how customers reach you.</p>
                </div>
                
                <Field label="WhatsApp Number" value={form.whatsapp_number} onChange={v => set("whatsapp_number", v)} onBlur={handlePhoneBlur} placeholder="+233 24 000 0000" type="tel" />
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1.5">Custom Message Template</label>
                  <p className="text-gray-400 text-xs mb-3">
                    Variables: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{"{items}"}</code> <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{"{total}"}</code>
                  </p>
                  <textarea value={form.whatsapp_template} onChange={e => set("whatsapp_template", e.target.value)} placeholder={"Hi! I'd like to order:\n{items}\n\nTotal: {total}\n\nPlease confirm."} rows={5} className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-3 text-gray-900 outline-none text-sm bg-gray-50 focus:bg-white resize-none transition-colors" />
                </div>

                {waPreview && (
                  <div className="rounded-xl bg-green-50 border border-green-100 p-4 relative">
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl rounded-tr-xl">PREVIEW</div>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans mt-2">{waPreview}</pre>
                  </div>
                )}
              </section>

              <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Social Media Links</h2>
                  <p className="text-gray-500 text-sm mt-1">Full URLs to appear in your store footer.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Instagram" value={form.social_instagram} onChange={v => set("social_instagram", v)} placeholder="https://instagram.com/..." />
                  <Field label="TikTok" value={form.social_tiktok} onChange={v => set("social_tiktok", v)} placeholder="https://tiktok.com/@..." />
                  <Field label="Facebook" value={form.social_facebook} onChange={v => set("social_facebook", v)} placeholder="https://facebook.com/..." />
                  <Field label="X / Twitter" value={form.social_twitter} onChange={v => set("social_twitter", v)} placeholder="https://x.com/..." />
                </div>
              </section>
            </div>
          )}

          {/* CHECKOUT & NOTIFICATIONS TAB */}
          {activeTab === 'checkout' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Payment Methods</h2>
                  <p className="text-gray-500 text-sm mt-1">Select which payment methods you accept at checkout.</p>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { id: 'momo', label: 'Mobile Money' },
                    { id: 'cod', label: 'Cash on Delivery' },
                    { id: 'bank', label: 'Bank Transfer' },
                    { id: 'card', label: 'Credit/Debit Card' }
                  ].map(method => (
                    <label key={method.id} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={form.payment_methods.includes(method.id)} 
                        onChange={() => togglePaymentMethod(method.id)}
                        className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <span className="text-gray-700 font-medium">{method.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Order Rules</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Auto-cancel pending orders after (hours)" value={form.order_auto_cancel_hours} onChange={v => set("order_auto_cancel_hours", v)} placeholder="0 = Never" type="number" />
                </div>
                <p className="text-xs text-gray-400">If set to 0, pending orders will remain in your dashboard indefinitely until manually managed.</p>
              </section>

              {isAdmin && (
                <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">Promotional Banner</h2>
                      <p className="text-gray-500 text-sm mt-1">A dismissible bar at the very top of the store.</p>
                    </div>
                    <ToggleSwitch checked={form.announcement_active} onChange={v => set("announcement_active", v)} />
                  </div>
                  {form.announcement_active && (
                    <div className="space-y-4 pt-2">
                      <Field label="Banner Message" value={form.announcement_text} onChange={v => set("announcement_text", v)} placeholder="Free delivery this weekend!" />
                      <Field label="Link (optional)" value={form.announcement_link} onChange={v => set("announcement_link", v)} placeholder="/shop or https://..." />
                    </div>
                  )}
                </section>
              )}

              <PushSettings />
            </div>
          )}

          {/* ADVANCED TAB */}
          {activeTab === 'advanced' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">SEO & Metadata</h2>
                  <p className="text-gray-500 text-sm mt-1">Control how your store appears on Google and social media.</p>
                </div>
                <Field label="Meta Title" value={form.seo_meta_title} onChange={v => set("seo_meta_title", v)} placeholder="Catalog | Buy Best Products" />
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1.5">Meta Description</label>
                  <textarea aria-label="Meta Description" value={form.seo_meta_description} onChange={e => set("seo_meta_description", e.target.value)} rows={3} className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 outline-none text-sm bg-gray-50 focus:bg-white resize-none transition-colors" />
                </div>
              </section>

              <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Analytics Tracking</h2>
                  <p className="text-gray-500 text-sm mt-1">Connect third-party tracking pixels.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Google Analytics (G-XXXX)" value={form.analytics_google_id} onChange={v => set("analytics_google_id", v)} placeholder="G-..." />
                  <Field label="Meta / Facebook Pixel ID" value={form.analytics_pixel_id} onChange={v => set("analytics_pixel_id", v)} placeholder="1234567890" />
                </div>
              </section>

              <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Global Pricing Markup</h2>
                  <p className="text-gray-500 text-sm mt-1">Automatically add this percentage to the price of all merchant (and admin) products.</p>
                </div>
                <Field label="Markup Percentage (%)" value={form.markup_percentage} onChange={v => set("markup_percentage", v)} placeholder="e.g. 10" type="number" />
                <p className="text-xs text-gray-400">If a product base price is 100 and markup is 10%, customers will see 110. You can override this per-store in Admin Approvals.</p>
              </section>

              {isAdmin && (
                <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">Visitor Counter</h2>
                      <p className="text-gray-500 text-sm mt-1">Display a live visitor count bubble on the storefront.</p>
                    </div>
                    <div className="flex-shrink-0 mt-1">
                      <ToggleSwitch checked={form.show_visitor_count} onChange={v => set("show_visitor_count", v)} />
                    </div>
                  </div>
                </section>
              )}

              <section className="bg-red-50 rounded-3xl border border-red-100 p-6 space-y-5 mt-8">
                <div>
                  <h2 className="font-bold text-red-900 text-lg flex items-center gap-2"><Trash size={18} /> Danger Zone</h2>
                  <p className="text-red-700/80 text-sm mt-1">Destructive actions for your store.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button type="button" className="text-left px-4 py-3 bg-white border border-red-200 rounded-xl text-red-600 font-medium hover:bg-red-50 transition-colors">
                    Reset Visitor Analytics
                  </button>
                  <button type="button" className="text-left px-4 py-3 bg-white border border-red-200 rounded-xl text-red-600 font-medium hover:bg-red-50 transition-colors">
                    Restore Default Settings
                  </button>
                </div>
              </section>

            </div>
          )}

        </div>

        {/* Global Save Button - Sticky Bottom */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm font-medium text-gray-500 hidden sm:block">
              {isDirty ? 'You have unsaved changes' : 'Everything is up to date'}
            </div>
            <button 
              type="button" 
              onClick={() => save.mutate()} 
              disabled={save.isPending || !isDirty} 
              className="w-full sm:w-auto px-8 py-3 flex items-center justify-center gap-2 bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition-all shadow-sm"
            >
              {saved ? <CheckCircle size={18} /> : <Save size={18} />}
              {saved ? "Saved!" : save.isPending ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}

function Field({ label, value, onChange, onBlur, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-gray-700 text-sm font-medium mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white transition-colors" />
    </div>
  )
}

function PushSettings() {
  const [pushEnabled, setPushEnabled] = useState(false)
  const [isPushLoading, setIsPushLoading] = useState(true)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    getActiveSubscription().then(sub => {
      setPushEnabled(!!sub)
      setIsPushLoading(false)
    }).catch(() => setIsPushLoading(false))
  }, [])

  const handlePushToggle = async (enable: boolean) => {
    if (!pushIsSupported()) {
      toast.error("Push notifications are not supported in this browser. If you are on iOS, add the app to your Home Screen first.")
      return
    }
    setIsPushLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not logged in")
      if (enable) {
        const sub = await subscribeToPush(user.id)
        setPushEnabled(!!sub)
        toast[sub ? "success" : "error"](sub ? "Push notifications enabled for this device!" : "Notification permission was denied.")
      } else {
        await unsubscribeFromPush(user.id)
        setPushEnabled(false)
        toast.success("Push notifications disabled.")
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to toggle push notifications: " + err.message)
      setPushEnabled(false)
    } finally {
      setIsPushLoading(false)
    }
  }

  return (
    <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900 text-lg">Push Notifications</h2>
          <p className="text-gray-500 text-sm mt-1">Receive alerts on this device when you get a new order.</p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {isPushLoading && <Loader2 size={16} className="animate-spin text-gray-400" />}
          <ToggleSwitch checked={pushEnabled} onChange={handlePushToggle} ariaLabel="Toggle push notifications" />
        </div>
      </div>
    </section>
  )
}

function ToggleSwitch({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel?: string }) {
  return (
    <label className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors cursor-pointer ${checked ? "bg-brand-500" : "bg-gray-200"}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only"
        aria-label={ariaLabel || "Toggle setting"}
      />
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-[26px]" : "translate-x-0.5"}`} />
    </label>
  )
}