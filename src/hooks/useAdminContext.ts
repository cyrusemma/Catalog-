import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface AdminContextData {
  isAdmin: boolean
  storeId: string | null
  approvalStatus: string | null
  adminWhatsapp: string
  currency: string
}

export function useAdminContext() {
  return useQuery<AdminContextData>({
    queryKey: ['admin-user-context'],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      const isAdmin = user?.app_metadata?.role === 'admin'
      let storeId: string | null = null
      let approvalStatus: string | null = null
      let storeCurrency: string | null = null

      if (user && !isAdmin) {
        const { data: store } = await supabase
          .from('stores')
          .select('id, approval_status, currency')
          .eq('owner_id', user.id)
          .maybeSingle()
        if (store) {
          storeId = store.id
          approvalStatus = store.approval_status
          storeCurrency = store.currency
        }
      }

      // Default fallback settings
      let adminWhatsapp = '233000000000'
      try {
        const { data: settings } = await supabase.from('store_settings').select('whatsapp_number').single()
        if (settings?.whatsapp_number) {
          adminWhatsapp = settings.whatsapp_number
        }
      } catch {
        // Fallback if settings table is empty or error occurs
      }

      return { isAdmin, storeId, approvalStatus, adminWhatsapp, currency: storeCurrency || 'GHS' }
    },
    staleTime: 1000 * 60 * 15, // Cache the admin/store context lookup for 15 minutes
  })
}
