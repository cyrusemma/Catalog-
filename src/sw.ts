/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// ──────────────────────────────────────────────────────────────────────────
// Workbox precache + runtime cache — same behaviour as the old generateSW
// config, just inlined here so we can layer push handlers below it.
// ──────────────────────────────────────────────────────────────────────────

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Navigation fallback: when an offline navigation can't be served from the
// precache, hand back /offline.html instead of the browser's dino.
const offlineHandler = createHandlerBoundToURL('/offline.html')
registerRoute(
  new NavigationRoute(offlineHandler, {
    denylist: [/^\/admin/, /^\/api\//],
  }),
)

// Supabase REST reads (products, categories, settings): network-FIRST so the
// storefront always shows fresh data when online, only falling back to cache
// when the network is unavailable.
//
// This deliberately replaces stale-while-revalidate: SWR could pin a stale,
// empty `[]` product response in the cache and keep serving it — making the
// shop look empty even after products exist in the database. The cache name is
// bumped (-v2) so any already-poisoned `supabase-rest` cache is abandoned.
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/'),
  new NetworkFirst({
    cacheName: 'supabase-rest-v2',
    networkTimeoutSeconds: 4,
    plugins: [
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

// Supabase storage objects: cache-first with a long TTL since the URLs are
// content-addressed by filename.
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/v1/object/'),
  new CacheFirst({
    cacheName: 'supabase-images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

// Any other image (placeholder.co, external CDN).
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'external-images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 7 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

// Auth requests must always go to the network — never serve a cached login or
// token refresh. Browsers default to no-cache on these, but stating it out
// loud keeps a future Workbox upgrade from accidentally intercepting them.
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/auth/v1/'),
  new NetworkOnly(),
)

// ──────────────────────────────────────────────────────────────────────────
// Web Push — new-arrival notifications.
//
// The Edge Function `notify-new-arrival` sends a JSON payload with title,
// body, icon, and a click_url. We show a system notification and, when the
// user taps it, focus or open the matching tab.
// ──────────────────────────────────────────────────────────────────────────

interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  click_url?: string
  tag?: string
}

self.addEventListener('push', (event: PushEvent) => {
  let payload: PushPayload | null = null
  if (event.data) {
    try {
      payload = event.data.json() as PushPayload
    } catch {
      // If the message wasn't JSON, fall back to plain text in the body.
      payload = { title: 'New arrival', body: event.data.text() }
    }
  }
  if (!payload) {
    payload = { title: 'New arrival', body: 'A new product just dropped — open the catalog to take a look.' }
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/favicon-32.png',
    // tag de-dupes notifications for the same product so spammy double-sends
    // collapse into a single visible card on the user's lock screen.
    tag: payload.tag,
    data: { click_url: payload.click_url || '/' },
    // any-cast so we can pass the `vibrate` field on devices that support it
    // without making the type strict.
  } as any
  ;(options as any).vibrate = [120, 60, 120]

  event.waitUntil(self.registration.showNotification(payload.title, options))
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const data = (event.notification.data ?? {}) as { click_url?: string }
  const targetUrl = data.click_url || '/'

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const absolute = new URL(targetUrl, self.location.origin).href

      // Try to focus an already-open tab pointing at the same place first.
      for (const client of clientsList) {
        if (client.url === absolute && 'focus' in client) {
          await (client as WindowClient).focus()
          return
        }
      }
      // Otherwise focus any storefront tab and navigate it.
      for (const client of clientsList) {
        if ('focus' in client && 'navigate' in client) {
          await (client as WindowClient).focus()
          try {
            await (client as WindowClient).navigate(absolute)
          } catch {
            /* navigation can fail across origins — fall through to open */
          }
          return
        }
      }
      // No open tab — open a fresh one.
      if (self.clients.openWindow) {
        await self.clients.openWindow(absolute)
      }
    })(),
  )
})

// Allow the page to ask the SW to skip waiting after a release.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
