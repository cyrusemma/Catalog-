import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useCustomerSession } from '../../hooks/useCustomerSession'
import { useToastStore } from '../../store/toastStore'

export default function NewArrivalsListener() {
  const { session } = useCustomerSession()
  const addToast = useToastStore(s => s.addToast)

  useEffect(() => {
    // Only listen for new arrivals if the user is logged in
    if (!session) return

    const channel = supabase
      .channel('public:products')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          const newProduct = payload.new
          // Only show notification if the product is published
          if (newProduct.is_published) {
            addToast({
              title: '✨ New Arrival!',
              message: `Just added: ${newProduct.title}`,
              type: 'info',
              duration: 8000,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, addToast])

  return null
}
