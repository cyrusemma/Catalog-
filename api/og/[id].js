import { createClient } from '@supabase/supabase-js'

// Uses the service role key so it bypasses RLS — safe here because this
// endpoint only emits public-safe fields (title, image, price, description).
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// HTML-escape user-controlled strings before injecting into the page template.
// Without this, a product title containing < or " could break the markup or
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
  const { id } = req.query

  const { data: product, error } = await supabase
    .from('products')
    .select('title, images, selling_price, description, category, brand')
    .eq('id', id)
    .single()

  if (error || !product) {
    return res.status(404).send('Product not found')
  }

  const siteUrl = process.env.VITE_SITE_URL || `https://${req.headers.host}`
  const storeName = process.env.VITE_STORE_NAME || 'Catalog by Cyrus'

  const title = `${product.title} — GH₵ ${product.selling_price}`
  const description =
    product.description ||
    `Buy ${product.title} for GH₵ ${product.selling_price}. Order via WhatsApp.`
  const firstImage =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : null
  const image =
    firstImage && isSafeImageUrl(firstImage) ? firstImage : `${siteUrl}/favicon.svg`
  const url = `${siteUrl}/product/${id}`

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />

    <!-- Open Graph (WhatsApp, Facebook, LinkedIn, Telegram) -->
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:site_name" content="${esc(storeName)}" />
    <meta property="product:price:amount" content="${esc(product.selling_price)}" />
    <meta property="product:price:currency" content="GHS" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(image)}" />

    <!-- Schema.org Product (Google Shopping, search-result rich snippets) -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": ${JSON.stringify(product.title)},
      "image": ${JSON.stringify(image)},
      "description": ${JSON.stringify(description)},
      ${product.brand ? `"brand": { "@type": "Brand", "name": ${JSON.stringify(product.brand)} },` : ''}
      ${product.category ? `"category": ${JSON.stringify(product.category)},` : ''}
      "offers": {
        "@type": "Offer",
        "priceCurrency": "GHS",
        "price": "${esc(product.selling_price)}",
        "availability": "https://schema.org/InStock",
        "url": ${JSON.stringify(url)}
      }
    }
    </script>

    <!-- Real users that somehow land on this endpoint get redirected to the SPA -->
    <script>window.location.href = ${JSON.stringify(url)};</script>
  </head>
  <body>
    <p>Loading product…</p>
  </body>
</html>`

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(200).send(html)
}
