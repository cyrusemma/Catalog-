import { useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useCustomerSession } from '../../hooks/useCustomerSession'
import { useWishlistStore } from '../../store/wishlistStore'

export default function WishlistSync() {
  const { user, profile, loading } = useCustomerSession()
  const { items: localItems, setItems } = useWishlistStore()
  
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
    const cloudWishlist = Array.isArray(profile.wishlist) ? profile.wishlist : []
    
    if (syncedUserId.current === '') {
      // Transitioned from logged-out to logged-in during this session.
      // Merge guest wishlist with cloud wishlist by product ID.
      const mergedMap = new Map<string, any>()
      
      cloudWishlist.forEach(item => {
        if (item && item.id) {
          mergedMap.set(item.id, item)
        }
      })
      
      localItems.forEach(item => {
        if (item && item.id) {
          mergedMap.set(item.id, item)
        }
      })

      const mergedWishlist = Array.from(mergedMap.values())
      isMerging.current = true
      setItems(mergedWishlist)
      supabase.from('profiles').update({ wishlist: mergedWishlist }).eq('id', user.id).then(() => {
        isMerging.current = false
      })

    } else {
      // Initial page load while already logged in.
      // Cloud wishlist is the cross-device source of truth.
      isMerging.current = true
      setItems(cloudWishlist)
      // Slight delay to prevent immediate re-sync from Zustand subscribe
      setTimeout(() => { isMerging.current = false }, 100)
    }

    syncedUserId.current = user.id
  }, [user, profile, loading, localItems, setItems])

  // --- PUSH CHANGES TO CLOUD ---
  useEffect(() => {
    if (!user) return
    const unsub = useWishlistStore.subscribe((state, prevState) => {
      if (isMerging.current) return
      
      if (JSON.stringify(state.items) !== JSON.stringify(prevState.items) && syncedUserId.current === user.id) {
        supabase.from('profiles').update({ wishlist: state.items }).eq('id', user.id)
      }
    })
    return unsub
  }, [user])

  return null
}
