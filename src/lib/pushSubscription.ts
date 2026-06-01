import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

/** True when this browser can plausibly receive web pushes (PWA + permission). */
export function pushIsSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!VAPID_PUBLIC_KEY
  )
}

/** Browser-native conversion: base64url string → Uint8Array (what PushManager wants). */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  // Back the view with a concrete ArrayBuffer so the result is a valid
  // BufferSource for pushManager.subscribe (not a SharedArrayBuffer-typed one).
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function subscriptionToRow(sub: PushSubscription) {
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  return {
    endpoint: json.endpoint || sub.endpoint,
    p256dh: json.keys?.p256dh || '',
    auth: json.keys?.auth || '',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  }
}

/** Returns the current SW PushSubscription if any. Doesn't trigger a permission prompt. */
export async function getActiveSubscription(): Promise<PushSubscription | null> {
  if (!pushIsSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

/**
 * Ask the browser for notification permission (if not already granted), then
 * subscribe with the service worker and store the subscription in the DB
 * keyed to the signed-in user. Returns the saved subscription, or null if the
 * user blocked permission.
 */
export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  if (!pushIsSupported()) throw new Error('Push notifications are not supported on this device.')
  if (!VAPID_PUBLIC_KEY) throw new Error('Push notifications are not configured yet (missing VAPID public key).')

  // Ask the browser. iOS specifically requires this be inside a user gesture
  // and only works on PWAs installed to the home screen.
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const reg = await navigator.serviceWorker.ready
  // Reuse an existing subscription if there is one; otherwise create.
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const row = subscriptionToRow(sub)
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, ...row }, { onConflict: 'user_id,endpoint' })

  if (error) throw error
  return sub
}

/** Tear down the SW subscription + remove the matching row from the DB. */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!pushIsSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return

  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => {})

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
}
