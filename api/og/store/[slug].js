import { createClient } from '@supabase/supabase-js'

// Uses the service role key so it bypasses RLS — safe here because this
// endpoint only emits public-safe fields (name, tagline, logo).
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// HTML-escape user-controlled strings before injecting into the page template.
// Without this, a store name containing < or " could break the markup or
// inject script tags.
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const isSafeImageUrl = (url) => {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export default async function handler(req, res) {
  const { slug } = req.query

  const { data: store, error } = await supabase
    .from('stores')
    .select('name, tagline, logo_url')
    .eq('slug', slug)
    .single()

  if (error || !store) {
    return res.status(404).send('Store not found')
  }

  const siteUrl = process.env.VITE_SITE_URL || `https://${req.headers.host}`

  const title = store.name || 'Catalog Store'
  const description = store.tagline || 'Welcome to our store! Shop our latest collection.'
  
  const image = store.logo_url && isSafeImageUrl(store.logo_url) 
    ? store.logo_url 
    : `${siteUrl}/favicon.svg`
    
  const url = `${siteUrl}/s/${slug}`

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />

    <!-- Open Graph (WhatsApp, Facebook, LinkedIn, Telegram) -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:site_name" content="${esc(title)}" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(image)}" />

    <!-- Real users that somehow land on this endpoint get redirected to the SPA -->
    <script>window.location.href = ${JSON.stringify(url)};</script>
  </head>
  <body>
    <p>Loading store…</p>
  </body>
</html>`

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(200).send(html)
}
