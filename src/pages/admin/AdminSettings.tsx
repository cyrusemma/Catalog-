import { useState, useEffect, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Save, CheckCircle, Upload, X, Image as ImageIcon, GripVertical, Loader2, Eye, AlertTriangle } from "lucide-react"
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
  }
}

export default function AdminSettings() {
  const [form, setForm] = useState<SettingsForm>(emptyForm)
  const [isDirty, setIsDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadError, setUploadError] = useState("")
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

  const { data: context, isLoading: contextLoading } = useQuery({
    queryKey: ["admin-user-context"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      const isAdmin = user?.app_metadata?.role === "admin"
      let storeId: string | null = null
      if (user && !isAdmin) {
        const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user.id).maybeSingle()
        if (store) storeId = store.id
      }
      return { isAdmin, storeId }
    }
  })

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
        const merchantPayload = {
          currency: payload.currency,
          whatsapp_number: payload.whatsapp_number,
          whatsapp_template: payload.whatsapp_template,
          social_instagram: payload.social_instagram,
          social_tiktok: payload.social_tiktok,
          social_facebook: payload.social_facebook,
          social_twitter: payload.social_twitter,
          name: form.store_name,
          tagline: form.tagline,
        }
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
    setUploadError("")
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) { uploaded.push(await uploadToBucket(file, "hero")) }
      set("hero_images", [...form.hero_images, ...uploaded])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploadingHero(false)
      if (heroInputRef.current) heroInputRef.current.value = ""
    }
  }

  const handleLogoUpload = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setUploadingLogo(true)
    setUploadError("")
    try {
      const url = await uploadToBucket(file, "logo")
      set("logo_url", url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed")
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
    if (!isValidImageUrl(url)) { setUploadError("URL must start with http:// or https://"); return }
    setUploadError("")
    set("hero_images", [...form.hero_images, url])
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

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl pb-32 lg:pb-10">
        <div className="mb-5 lg:mb-8 flex items-start justify-between gap-3">
          <div>
            <p className="text-gray-400 text-xs lg:text-sm mb-1">Settings</p>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Store Settings</h1>
          </div>
          {isDirty && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-xl mt-1">
              <AlertTriangle size={12} />
              Unsaved changes
            </div>
          )}
        </div>

        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">Basic info</h2>
            <Field label="Store name" value={form.store_name} onChange={v => set("store_name", v)} placeholder="Catalog by Cyrus" />
            <Field label="Tagline / hero text" value={form.tagline} onChange={v => set("tagline", v)} placeholder="Discover Amazing Products..." />
            <Field label="WhatsApp number" value={form.whatsapp_number} onChange={v => set("whatsapp_number", v)} onBlur={handlePhoneBlur} placeholder="+233 24 000 0000" type="tel" />
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1.5">Currency</label>
              <select
                value={form.currency}
                onChange={e => set("currency", e.target.value)}
                className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2 text-gray-900 outline-none text-sm bg-gray-50 focus:bg-white transition-colors"
              >
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
          </section>

          {isAdmin && (
            <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div>
                <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">Brand logo</h2>
                <p className="text-gray-400 text-[11px] mt-1">Shown in the navbar and admin. Square or wide PNG/SVG works best.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {form.logo_url ? <img src={form.logo_url} alt="Logo preview" className="w-full h-full object-contain" /> : <ImageIcon size={20} className="text-gray-300" />}
                </div>
                <div className="flex-1 flex flex-wrap gap-2">
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" aria-label="Upload logo" onChange={e => handleLogoUpload(e.target.files)} className="hidden" />
                  <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="bg-brand-400 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5">
                    {uploadingLogo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {form.logo_url ? "Replace" : "Upload"}
                  </button>
                  {form.logo_url && (
                    <button type="button" onClick={() => set("logo_url", "")} className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-4 py-2 rounded-xl">Remove</button>
                  )}
                </div>
              </div>
            </section>
          )}

          {isAdmin && (
            <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div>
                <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">Hero carousel</h2>
                <p className="text-gray-400 text-[11px] mt-1">Upload one or more images for the home page hero. They auto-rotate. Drag to reorder.</p>
              </div>
              {form.hero_images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {form.hero_images.map((img, i) => (
                    <div key={img + i} draggable onDragStart={() => setDraggedIdx(i)} onDragOver={e => e.preventDefault()} onDrop={() => { if (draggedIdx !== null) moveHero(draggedIdx, i); setDraggedIdx(null) }} onDragEnd={() => setDraggedIdx(null)} className={`relative aspect-video rounded-xl overflow-hidden border-2 cursor-move group ${draggedIdx === i ? "border-brand-400 opacity-60" : "border-transparent"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">#{i + 1}</div>
                      <div className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100"><GripVertical size={10} /></div>
                      <button type="button" onClick={() => set("hero_images", form.hero_images.filter((_, j) => j !== i))} aria-label={`Remove hero image ${i + 1}`} className="absolute bottom-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <input ref={heroInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Upload hero images" onChange={e => handleHeroUpload(e.target.files)} className="hidden" />
                <button type="button" onClick={() => heroInputRef.current?.click()} disabled={uploadingHero} className="bg-brand-400 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5">
                  {uploadingHero ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {uploadingHero ? "Uploading..." : "Upload images"}
                </button>
                <button type="button" onClick={addHeroFromUrl} className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-4 py-2 rounded-xl">+ Paste URL</button>
              </div>
              {form.hero_images.length === 0 && <p className="text-gray-400 text-[11px]">No custom hero images yet - the default photo will show.</p>}
              <div className="pt-2">
                <label htmlFor="rotation" className="block text-gray-600 text-xs font-medium mb-1.5">Rotation interval (seconds)</label>
                <input id="rotation" type="number" min="2" max="60" value={form.hero_rotation_seconds} onChange={e => handleRotationChange(e.target.value)} className={`w-32 border rounded-xl px-4 py-2 text-gray-900 outline-none text-sm bg-gray-50 focus:bg-white transition-colors ${rotationError ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-brand-400"}`} />
                {rotationError && <p className="text-red-500 text-[11px] mt-1">{rotationError}</p>}
              </div>
              {uploadError && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{uploadError}</p>}
            </section>
          )}

          {isAdmin && (
            <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">Announcement banner</h2>
                  <p className="text-gray-400 text-[11px] mt-1">A thin amber bar at the very top of the storefront - great for promos or shipping cut-offs.</p>
                </div>
                <ToggleSwitch checked={form.announcement_active} onChange={v => set("announcement_active", v)} />
              </div>
              <Field label="Message" value={form.announcement_text} onChange={v => set("announcement_text", v)} placeholder="Free delivery this weekend!" />
              <Field label="Link (optional)" value={form.announcement_link} onChange={v => set("announcement_link", v)} placeholder="/shop or https://..." />
            </section>
          )}

          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">Social links</h2>
              <p className="text-gray-400 text-[11px] mt-1">Full URLs. They appear in the storefront footer.</p>
            </div>
            <Field label="Instagram" value={form.social_instagram} onChange={v => set("social_instagram", v)} placeholder="https://instagram.com/yourhandle" />
            <Field label="TikTok" value={form.social_tiktok} onChange={v => set("social_tiktok", v)} placeholder="https://tiktok.com/@yourhandle" />
            <Field label="Facebook" value={form.social_facebook} onChange={v => set("social_facebook", v)} placeholder="https://facebook.com/yourpage" />
            <Field label="X / Twitter" value={form.social_twitter} onChange={v => set("social_twitter", v)} placeholder="https://x.com/yourhandle" />
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div>
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">WhatsApp message template</h2>
              <p className="text-gray-400 text-[11px] mt-1">
                Override the default order message. Use <code className="text-brand-500">{"{items}"}</code>, <code className="text-brand-500">{"{subtotal}"}</code>, <code className="text-brand-500">{"{delivery}"}</code>, <code className="text-brand-500">{"{total}"}</code>, <code className="text-brand-500">{"{currency}"}</code>. Leave blank for the default.
              </p>
            </div>
            <textarea value={form.whatsapp_template} onChange={e => set("whatsapp_template", e.target.value)} placeholder={"Hi! I'd like to order:\n{items}\n\n{total}\n\nPlease confirm. Thanks!"} rows={6} className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white resize-none" />
            {waPreview && (
              <div className="rounded-xl bg-[#e8f5e9] border border-[#c8e6c9] p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-green-700">
                  <Eye size={12} />
                  Preview
                </div>
                <pre className="text-[11px] text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{waPreview}</pre>
              </div>
            )}
          </section>

          {isAdmin && (
            <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">Visitor counter</h2>
                  <p className="text-gray-400 text-[11px] mt-1">Show a small floating eye + total-visits chip on the storefront. Off by default.</p>
                </div>
                <ToggleSwitch checked={form.show_visitor_count} onChange={v => set("show_visitor_count", v)} />
              </div>
            </section>
          )}

          <PushSettings />

          <button type="button" onClick={() => save.mutate()} disabled={save.isPending || !isDirty} className="w-full flex items-center justify-center gap-2 bg-brand-400 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors sticky bottom-4">
            {saved ? <CheckCircle size={17} /> : <Save size={17} />}
            {saved ? "Saved!" : save.isPending ? "Saving..." : isDirty ? "Save Changes" : "No Changes"}
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}

function Field({ label, value, onChange, onBlur, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-gray-700 text-sm font-medium mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white transition-colors" />
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
    <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">Order Notifications (Web Push)</h2>
          <p className="text-gray-400 text-[11px] mt-1">Receive instant push notifications on this device when a customer places an order.</p>
        </div>
        <div className="flex items-center gap-2">
          {isPushLoading && <Loader2 size={14} className="animate-spin text-gray-400" />}
          <ToggleSwitch checked={pushEnabled} onChange={handlePushToggle} ariaLabel="Toggle push notifications" />
        </div>
      </div>
    </section>
  )
}

function ToggleSwitch({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} role="switch" aria-checked={checked ? "true" : "false"} aria-label={ariaLabel || "Toggle setting"} title={ariaLabel || "Toggle setting"} className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? "bg-brand-400" : "bg-gray-200"}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  )
}