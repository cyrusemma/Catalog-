import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, CheckCircle } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function AdminSettings() {
  const [form, setForm] = useState({
    store_name: 'Catalog by Cyrus',
    tagline: 'Discover Amazing Products Brought to you By Cyrus',
    whatsapp_number: '',
    currency: 'GHS',
  })
  const [saved, setSaved] = useState(false)
  const qc = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('store_settings').select('*').single()
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
      })
    }
  }, [settings])

  const save = useMutation({
    mutationFn: async () => {
      if (settings) {
        await supabase.from('store_settings').update(form).eq('id', settings.id)
      } else {
        await supabase.from('store_settings').insert(form)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const fields = [
    { key: 'store_name', label: 'Store Name', placeholder: 'Catalog by Cyrus', type: 'text' },
    { key: 'tagline', label: 'Tagline / Hero Text', placeholder: 'Discover Amazing Products...', type: 'text' },
    { key: 'whatsapp_number', label: 'WhatsApp Number', placeholder: '233244000000 (include country code, no +)', type: 'tel' },
    { key: 'currency', label: 'Currency Symbol', placeholder: 'GHS', type: 'text' },
  ]

  return (
    <AdminLayout>
      <div className="p-8 max-w-xl">
        <div className="mb-8">
          <p className="text-gray-400 text-sm mb-1">Settings</p>
          <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-gray-700 text-sm font-medium mb-1.5">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key as keyof typeof form]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none text-sm bg-gray-50 focus:bg-white"
              />
            </div>
          ))}

          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="w-full flex items-center justify-center gap-2 bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {saved ? <CheckCircle size={17} /> : <Save size={17} />}
            {saved ? 'Saved!' : save.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
