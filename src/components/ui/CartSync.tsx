import { useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useCustomerSession } from '../../hooks/useCustomerSession'
import { useCartStore } from '../../store/cartStore'

export default function CartSync() {
  const { user, profile, loading } = useCustomerSession()
  const { items: localItems, setItems } = useCartStore()
  
  // Track if we've completed the initial sync for the current user
  // undefined = app just loaded
  // '' = logged out
  // 'id' = logged in and synced
  const syncedUserId = useRef<string | undefined>(undefined)
  const isMerging = useRef(false)

  useEffect(() => {
    if (loading) return

    if (!user) {
      syncedUserId.current = ''
      return
    }

    if (!profile) return

    if (syncedUserId.current === user.id) {
      return
    }

    // --- INITIAL SYNC ---
    const cloudCart = Array.isArray(profile.cart) ? profile.cart : []
    
    if (syncedUserId.current === '') {
      // Transitioned from logged-out to logged-in during this session.
      // Merge guest cart with cloud cart.
      const mergedMap = new Map<string, any>()
      
      cloudCart.forEach(item => {
        mergedMap.set(item.product.id, item)
      })
      
      localItems.forEach(item => {
        const existing = mergedMap.get(item.product.id)
        if (existing) {
          mergedMap.set(item.product.id, { ...existing, quantity: existing.quantity + item.quantity })
        } else {
          mergedMap.set(item.product.id, item)
        }
      })

      const mergedCart = Array.from(mergedMap.values())
      isMerging.current = true
      setItems(mergedCart)
      supabase.from('profiles').update({ cart: mergedCart }).eq('id', user.id).then(() => {
        isMerging.current = false
      })

    } else {
      // Initial page load while already logged in.
      // Cloud cart is the cross-device source of truth.
      isMerging.current = true
      setItems(cloudCart)
      // Slight delay to prevent immediate re-sync from Zustand subscribe
      setTimeout(() => { isMerging.current = false }, 100)
    }

    syncedUserId.current = user.id
  }, [user, profile, loading, localItems, setItems])

  // --- PUSH CHANGES TO CLOUD ---
  useEffect(() => {
    if (!user) return
    const unsub = useCartStore.subscribe((state, prevState) => {
      if (isMerging.current) return
      
      if (JSON.stringify(state.items) !== JSON.stringify(prevState.items) && syncedUserId.current === user.id) {
        supabase.from('profiles').update({ cart: state.items }).eq('id', user.id)
      }
    })
    return unsub
  }, [user])

  return null
}
