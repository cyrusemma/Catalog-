import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, CheckCircle, Upload, X, Image as ImageIcon, GripVertical, Loader2 } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'
import { extensionForMime, isValidImageUrl, validateImageFile } from '../../lib/productValidation'

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
  logo_url: string
  whatsapp_template: string
}

const emptyForm: SettingsForm = {
  store_name: 'Catalog by Cyrus',
  tagline: 'Discover Amazing Products Brought to you By Cyrus',
  whatsapp_number: '',
  currency: 'GHS',
  hero_images: [],
  hero_rotation_seconds: '6',
  announcement_text: '',
  announcement_active: false,
  announcement_link: '',
  social_instagram: '',
  social_tiktok: '',
  social_facebook: '',
  logo_url: '',
  whatsapp_template: '',
}

export default function AdminSettings() {
  const [form, setForm] = useState<SettingsForm>(emptyForm)
  const [saved, setSaved] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('store_settings').select('*').maybeSingle()
      return data
    },
  })

  useEffect(() => {
    if (settings) {
      setForm({
        store_name: settings.store_name || '',
        tagline: settings.tagline || '',
        whatsapp_number: settings.whatsapp_number || '',
        currency: settings.currency || 'GHS',
        hero_images: settings.hero_images || [],
        hero_rotation_seconds: settings.hero_rotation_seconds?.toString() || '6',
        announcement_text: settings.announcement_text || '',
        announcement_active: settings.announcement_active || false,
        announcement_link: settings.announcement_link || '',
        social_instagram: settings.social_instagram || '',
        social_tiktok: settings.social_tiktok || '',
        social_facebook: settings.social_facebook || '',
        logo_url: settings.logo_url || '',
        whatsapp_template: settings.whatsapp_template || '',
      })
    }
  }, [settings])

  const set = <K extends keyof SettingsForm>(key: K, val: SettingsForm[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        store_name: form.store_name,
        tagline: form.tagline,
        whatsapp_number: form.whatsapp_number,
        currency: form.currency,
        hero_images: form.hero_images,
        hero_rotation_seconds: Math.max(2, parseInt(form.hero_rotation_seconds, 10) || 6),
        announcement_text: form.announcement_text || null,
        announcement_active: form.announcement_active,
        announcement_link: form.announcement_link || null,
        social_instagram: form.social_instagram || null,
        social_tiktok: form.social_tiktok || null,
        social_facebook: form.social_facebook || null,
        logo_url: form.logo_url || null,
        whatsapp_template: form.whatsapp_template || null,
      }
      if (settings) {
        const { error } = await supabase.from('store_settings').update(payload).eq('id', settings.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('store_settings').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const uploadToBucket = async (file: File, prefix: string) => {
    const fileError = validateImageFile(file)
    if (fileError) throw new Error(fileError)
    const ext = extensionForMime(file.type)
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })
    if (error) throw error
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  }

  const handleHeroUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploadingHero(true)
    setUploadError('')
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        uploaded.push(await uploadToBucket(file, 'hero'))
      }
      set('hero_images', [...form.hero_images, ...uploaded])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingHero(false)
      if (heroInputRef.current) heroInputRef.current.value = ''
    }
  }

  const handleLogoUpload = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setUploadingLogo(true)
    setUploadError('')
    try {
      const url = await uploadToBucket(file, 'logo')
      set('logo_url', url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const moveHero = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return
    const next = [...form.hero_images]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    set('hero_images', next)
  }

  const addHeroFromUrl = () => {
    const url = prompt('Paste image URL')?.trim()
    if (!url) return
    if (!isValidImageUrl(url)) {
      setUploadError('URL must start with http:// or https://')
      return
    }
    setUploadError('')
    set('hero_images', [...form.hero_images, url])
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl pb-32 lg:pb-10">
        <div className="mb-5 lg:mb-8">
          <p className="text-gray-400 text-xs lg:text-sm mb-1">Settings</p>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Store Settings</h1>
        </div>

        <div className="space-y-5">
          {/* Basic info */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">Basic info</h2>
            <Field label="Store name" value={form.store_name} onChange={v => set('store_name', v)} placeholder="Catalog by Cyrus" />
            <Field label="Tagline / hero text" value={form.tagline} onChange={v => set('tagline', v)} placeholder="Discover Amazing Products…" />
            <Field label="WhatsApp number" value={form.whatsapp_number} onChange={v => set('whatsapp_number', v)} placeholder="233244000000 (no +)" type="tel" />
            <Field label="Currency symbol" value={form.currency} onChange={v => set('currency', v)} placeholder="GHS" />
          </section>

          {/* Logo */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div>
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">Brand logo</h2>
              <p className="text-gray-400 text-[11px] mt-1">Shown in the navbar and admin. Square or wide PNG/SVG works best.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo preview" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon size={20} className="text-gray-300" />
                )}
              </div>
              <div className="flex-1 flex flex-wrap gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  aria-label="Upload logo"
                  onChange={e => handleLogoUpload(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="bg-brand-400 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
                >
                  {uploadingLogo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {form.logo_url ? 'Replace' : 'Upload'}
                </button>
                {form.logo_url && (
                  <button
                    type="button"
                    onClick={() => set('logo_url', '')}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-4 py-2 rounded-xl"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Hero carousel */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div>
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">Hero carousel</h2>
              <p className="text-gray-400 text-[11px] mt-1">
                Upload one or more images for the home page hero. They auto-rotate. Drag to reorder.
              </p>
            </div>

            {form.hero_images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {form.hero_images.map((img, i) => (
                  <div
                    key={img + i}
                    draggable
                    onDragStart={() => setDraggedIdx(i)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => { if (draggedIdx !== null) moveHero(draggedIdx, i); setDraggedIdx(null) }}
                    onDragEnd={() => setDraggedIdx(null)}
                    className={`relative aspect-video rounded-xl overflow-hidden border-2 cursor-move group ${draggedIdx === i ? 'border-brand-400 opacity-60' : 'border-transparent'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">#{i + 1}</div>
                    <div className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100">
                      <GripVertical size={10} />
                    </div>
                    <button
                      type="button"
                      onClick={() => set('hero_images', form.hero_images.filter((_, j) => j !== i))}
                      aria-label={`Remove hero image ${i + 1}`}
                      className="absolute bottom-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <input
                ref={heroInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                aria-label="Upload hero images"
                onChange={e => handleHeroUpload(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => heroInputRef.current?.click()}
                disabled={uploadingHero}
                className="bg-brand-400 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                {uploadingHero ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {uploadingHero ? 'Uploading…' : 'Upload images'}
              </button>
              <button
                type="button"
                onClick={addHeroFromUrl}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-4 py-2 rounded-xl"
              >
                + Paste URL
              </button>
            </div>

            {form.hero_images.length === 0 && (
              <p className="text-gray-400 text-[11px]">
                No custom hero images yet — the default Cyrus boutique photo will show.
              </p>
            )}

            <div className="pt-2">
              <label htmlFor="rotation" className="block text-gray-600 text-xs font-medium mb-1.5">
                Rotation interval (seconds)
              </label>
              <input
                id="rotation"
                type="number"
                min="2"
                max="60"
                value={form.hero_rotation_seconds}
                onChange={e => set('hero_rotation_seconds', e.target.value)}
                className="w-32 border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2 text-gray-900 outline-none text-sm bg-gray-50 focus:bg-white"
              />
            </div>

            {uploadError && (
              <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{uploadError}</p>
            )}
          </section>

          {/* Announcement banner */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">Announcement banner</h2>
                <p className="text-gray-400 text-[11px] mt-1">
                  A thin amber bar at the very top of the storefront — great for promos or shipping cut-offs.
                </p>
              </div>
              <ToggleSwitch checked={form.announcement_active} onChange={v => set('announcement_active', v)} />
            </div>
            <Field
              label="Message"
              value={form.announcement_text}
              onChange={v => set('announcement_text', v)}
              placeholder="Free delivery this weekend!"
            />
            <Field
              label="Link (optional)"
              value={form.announcement_link}
              onChange={v => set('announcement_link', v)}
              placeholder="/shop or https://… "
            />
          </section>

          {/* Social links */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">Social links</h2>
              <p className="text-gray-400 text-[11px] mt-1">Full URLs. They appear in the storefront footer.</p>
            </div>
            <Field label="Instagram" value={form.social_instagram} onChange={v => set('social_instagram', v)} placeholder="https://instagram.com/yourhandle" />
            <Field label="TikTok" value={form.social_tiktok} onChange={v => set('social_tiktok', v)} placeholder="https://tiktok.com/@yourhandle" />
            <Field label="Facebook" value={form.social_facebook} onChange={v => set('social_facebook', v)} placeholder="https://facebook.com/yourpage" />
          </section>

          {/* WhatsApp template */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div>
              <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-400">WhatsApp message template</h2>
              <p className="text-gray-400 text-[11px] mt-1">
                Override the default order message. Use <code className="text-brand-500">{'{items}'}</code>, <code className="text-brand-500">{'{subtotal}'}</code>, <code className="text-brand-500">{'{delivery}'}</code>, <code className="text-brand-500">{'{total}'}</code>, <code className="text-brand-500">{'{currency}'}</code>. Leave blank for the default.
              </p>
            </div>
            <textarea
              value={form.whatsapp_template}
              onChange={e => set('whatsapp_template', e.target.value)}
              placeholder={"Hi! I'd like to order:\n{items}\n\n{total}\n\nPlease confirm. Thanks!"}
              rows={6}
              className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white resize-none"
            />
          </section>

          {/* Save button */}
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="w-full flex items-center justify-center gap-2 bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors sticky bottom-4"
          >
            {saved ? <CheckCircle size={17} /> : <Save size={17} />}
            {saved ? 'Saved!' : save.isPending ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-gray-700 text-sm font-medium mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white"
      />
    </div>
  )
}

function ToggleSwitch({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel || 'Toggle setting'}
      title={ariaLabel || 'Toggle setting'}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-brand-400' : 'bg-gray-200'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
