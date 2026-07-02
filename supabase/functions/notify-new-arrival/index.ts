// notify-new-arrival
// Sends a Web Push notification to every saved push_subscriptions row about
// a newly-published product. Triggered from the admin form (Authorization:
// Bearer <admin user JWT>), so verify_jwt stays on; we also explicitly check
// the caller is an admin before doing anything.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'
const SITE_URL = Deno.env.get('SITE_URL') || ''

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // 1. Authenticate the caller and require admin role.
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return json({ error: 'Missing token' }, 401)
  const { data: { user }, error: userErr } = await adminClient.auth.getUser(token)
  if (userErr || !user) return json({ error: 'Invalid token' }, 401)
  const role = (user.app_metadata as Record<string, unknown> | null)?.role
  if (role !== 'admin') return json({ error: 'Admin only' }, 403)

  // 2. Parse payload.
  let body: { product_id?: string } = {}
  try { body = await req.json() } catch { /* tolerate empty body */ }
  const productId = body.product_id
  if (!productId) return json({ error: 'product_id required' }, 400)

  // 3. Fetch the product so the notification has a real title/image.
  const { data: product, error: productErr } = await adminClient
    .from('products')
    .select('id, title, selling_price, images')
    .eq('id', productId)
    .maybeSingle()
  if (productErr || !product) return json({ error: 'Product not found' }, 404)

  // 4. Pull every saved subscription. Delivery should follow actual browser
  // subscriptions, not profile-flag joins that can exclude valid users when
  // profile rows/columns are missing.
  const { data: rows, error: rowsErr } = await adminClient
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, user_id')
  if (rowsErr) return json({ error: rowsErr.message }, 500)

  const subs = (rows ?? []) as Array<{
    id: string; endpoint: string; p256dh: string; auth: string; user_id: string
  }>

  const image = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null
  const clickUrl = `${SITE_URL || ''}/product/${product.id}`

  const payload = JSON.stringify({
    title: `New arrival: ${product.title}`,
    body: typeof product.selling_price === 'number'
      ? `Just dropped — GHS ${product.selling_price.toFixed(2)}. Tap to take a look.`
      : 'Just dropped. Tap to take a look.',
    icon: image || '/pwa-192x192.png',
    badge: '/favicon-32.png',
    click_url: clickUrl,
    tag: `product-${product.id}`,
  })

  // 5. Fan out. Gone-410 endpoints get deleted so the table stays clean.
  let sent = 0
  let failed = 0
  const staleIds: string[] = []

  await Promise.all(subs.map(async sub => {
    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    }
    try {
      await webpush.sendNotification(subscription, payload)
      sent++
    } catch (err) {
      const e = err as { statusCode?: number; body?: string }
      if (e.statusCode === 410 || e.statusCode === 404) {
        staleIds.push(sub.id)
      } else {
        failed++
        console.error('push failed', sub.endpoint, e.statusCode, e.body)
      }
    }
  }))

  if (staleIds.length > 0) {
    await adminClient.from('push_subscriptions').delete().in('id', staleIds)
  }

  return json({ ok: true, sent, failed, pruned: staleIds.length, total: subs.length })
})
