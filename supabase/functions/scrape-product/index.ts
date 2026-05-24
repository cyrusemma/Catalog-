import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_HOST_SUFFIXES = [
  'jumia.com',
  'jumia.com.gh',
  'amazon.com',
  'amazon.co.uk',
  'amazon.de',
  'aliexpress.com',
  'aliexpress.us',
  'ebay.com',
  'ebay.co.uk',
]

function isAdminUser(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }): boolean {
  const role = user.app_metadata?.role ?? user.user_metadata?.role
  return role === 'admin'
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (h === '127.0.0.1' || h === '0.0.0.0' || h === '::1') return true

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  if (ipv4) {
    const [, a, b] = ipv4.map(Number)
    if (a === 10) return true
    if (a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 0) return true
  }
  return false
}

function validateProductUrl(urlString: string): URL {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    throw new Error('Invalid URL')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('URL must use http or https')
  }

  const host = url.hostname.toLowerCase()
  if (isBlockedHost(host)) {
    throw new Error('URL host is not allowed')
  }

  const allowed = ALLOWED_HOST_SUFFIXES.some(
    suffix => host === suffix || host.endsWith(`.${suffix}`)
  )
  if (!allowed) {
    throw new Error('URL must be from Jumia, Amazon, AliExpress, or eBay')
  }

  return url
}

function metaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

function parsePrice(text: string | null): number | null {
  if (!text) return null
  const cleaned = text.replace(/[^\d.,]/g, '').replace(/,/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

async function scrapeProduct(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CatalogBot/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  })

  if (!res.ok) {
    throw new Error(`Could not fetch product page (${res.status})`)
  }

  const html = await res.text()
  const title =
    metaContent(html, 'og:title') ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
    null

  const description =
    metaContent(html, 'og:description') ||
    metaContent(html, 'description') ||
    null

  const image =
    metaContent(html, 'og:image') ||
    metaContent(html, 'twitter:image') ||
    null

  const priceText =
    metaContent(html, 'product:price:amount') ||
    metaContent(html, 'og:price:amount') ||
    null

  const selling_price = parsePrice(priceText)

  const images = image && (image.startsWith('http://') || image.startsWith('https://')) ? [image] : []

  return {
    title,
    description,
    images,
    selling_price,
    original_price: null,
    discount_percent: null,
    brand: null,
    category: null,
    key_features: [] as string[],
    stock_status: 'in_stock' as const,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user || !isAdminUser(user)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const validated = validateProductUrl(url.trim())
    const product = await scrapeProduct(validated.href)

    return new Response(JSON.stringify(product), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
