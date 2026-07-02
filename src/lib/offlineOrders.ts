import { supabase } from './supabase'

const OFFLINE_ORDERS_KEY = 'offline-orders-queue'

export interface OfflineOrder {
  id: string
  payload: any // The exact object sent to Supabase insert
  created_at: number
}

/** Get all pending offline orders from localStorage */
export function getOfflineOrders(): OfflineOrder[] {
  try {
    const raw = localStorage.getItem(OFFLINE_ORDERS_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to parse offline orders', e)
    return []
  }
}

/** Save an order to localStorage to be synced later */
export function saveOfflineOrder(payload: any) {
  const currentOrders = getOfflineOrders()
  
  // Ensure we don't save duplicate payload IDs
  const exists = currentOrders.some(o => o.id === payload.id)
  if (exists) return

  const offlineOrder: OfflineOrder = {
    id: payload.id,
    payload,
    created_at: Date.now()
  }

  currentOrders.push(offlineOrder)
  localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(currentOrders))
  console.log(`Order ${payload.id} saved offline. Will sync when online.`)
}

/** Remove an order from the offline queue */
function removeOfflineOrder(id: string) {
  const currentOrders = getOfflineOrders()
  const updatedOrders = currentOrders.filter(o => o.id !== id)
  localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(updatedOrders))
}

/** Attempt to sync all offline orders to Supabase */
export async function syncOfflineOrders() {
  if (!navigator.onLine) return

  const pendingOrders = getOfflineOrders()
  if (pendingOrders.length === 0) return

  console.log(`Attempting to sync ${pendingOrders.length} offline orders...`)

  for (const order of pendingOrders) {
    try {
      const { error } = await supabase.from('orders').insert(order.payload)
      
      // If no error, or if it's a duplicate key error (PGRST116/23505), remove it.
      // 23505 is PostgreSQL unique violation (meaning it actually got inserted previously).
      if (!error || error.code === '23505') {
        removeOfflineOrder(order.id)
        console.log(`Successfully synced offline order ${order.id}`)
      } else {
        console.error(`Failed to sync order ${order.id}`, error)
      }
    } catch (err) {
      console.error(`Exception while syncing order ${order.id}`, err)
    }
  }
}
