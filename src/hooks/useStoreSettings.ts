import { useQuery } from '@tanstack/react-query'

export interface StoreSettings {
  id: string
  store_name: string
  tagline: string
  whatsapp_number: string | null
  logo_url: string | null
  delivery_fee: number
  currency: string
  hero_images: string[]
  hero_rotation_seconds: number
  announcement_text: string | null
  announcement_active: boolean
  announcement_link: string | null
  social_instagram: string | null
  social_tiktok: string | null
  social_facebook: string | null
  whatsapp_template: string | null
}

const ENV_WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined
const ENV_STORE_NAME = (import.meta.env.VITE_STORE_NAME as string | undefined) || 'Catalog by Cyrus'

const DEFAULTS: StoreSettings = {
  id: '',
  store_name: ENV_STORE_NAME,
  tagline: 'Discover Amazing Products Brought to you By Cyrus',
  whatsapp_number: ENV_WHATSAPP ?? null,
  logo_url: null,
  delivery_fee: 0,
  currency: 'GHS',
  hero_images: [],
  hero_rotation_seconds: 6,
  announcement_text: null,
  announcement_active: false,
  announcement_link: null,
  social_instagram: null,
  social_tiktok: null,
  social_facebook: null,
  whatsapp_template: null,
}

export function useStoreSettings() {
  const { data } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async (): Promise<StoreSettings> => {
      const { supabase } = await import('../lib/supabase')
      const { data } = await supabase.from('store_settings').select('*').maybeSingle()
      if (!data) return DEFAULTS
      return {
        ...DEFAULTS,
        ...data,
        whatsapp_number: data.whatsapp_number || ENV_WHATSAPP || null,
        store_name: data.store_name || ENV_STORE_NAME,
      }
    },
    staleTime: 1000 * 60,
  })
  return data ?? DEFAULTS
}
