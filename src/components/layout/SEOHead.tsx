import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useStoreSettings } from '../../hooks/useStoreSettings'

export interface SEOHeadProps {
  title?: string
  description?: string
  image?: string
  type?: 'website' | 'article' | 'product'
  canonicalUrl?: string
  schemaData?: Record<string, any> | Array<Record<string, any>>
}

export default function SEOHead({
  title,
  description,
  image,
  type = 'website',
  canonicalUrl,
  schemaData,
}: SEOHeadProps) {
  const location = useLocation()
  const settings = useStoreSettings()

  const storeName = settings.store_name || 'Catalog by Cyrus'
  const defaultDescription =
    settings.tagline ||
    'Discover amazing products curated just for you. Shop our premium catalog with exclusive deals and WhatsApp checkout.'

  const pageTitle = title ? (title.includes(storeName) ? title : `${title} | ${storeName}`) : storeName
  const pageDescription = description || defaultDescription
  const pageImage = image || settings.logo_url || '/apple-touch-icon.png'
  const fullCanonicalUrl =
    canonicalUrl || (typeof window !== 'undefined' ? `${window.location.origin}${location.pathname}` : '')

  useEffect(() => {
    // 1. Update Title
    document.title = pageTitle

    // Helper to upsert meta tags
    const setMetaTag = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attrName, attrValue)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', pageDescription)

    // 3. OpenGraph Tags
    setMetaTag('property', 'og:site_name', storeName)
    setMetaTag('property', 'og:title', pageTitle)
    setMetaTag('property', 'og:description', pageDescription)
    setMetaTag('property', 'og:type', type)
    setMetaTag('property', 'og:url', fullCanonicalUrl)
    if (pageImage) {
      setMetaTag('property', 'og:image', pageImage)
    }

    // 4. Twitter Cards
    setMetaTag('name', 'twitter:card', pageImage ? 'summary_large_image' : 'summary')
    setMetaTag('name', 'twitter:title', pageTitle)
    setMetaTag('name', 'twitter:description', pageDescription)
    if (pageImage) {
      setMetaTag('name', 'twitter:image', pageImage)
    }

    // 5. Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]')
    if (!canonicalLink) {
      canonicalLink = document.createElement('link')
      canonicalLink.setAttribute('rel', 'canonical')
      document.head.appendChild(canonicalLink)
    }
    canonicalLink.setAttribute('href', fullCanonicalUrl)

    // 6. Structured Data (JSON-LD)
    let schemaScript = document.getElementById('page-structured-data') as HTMLScriptElement | null
    if (schemaData) {
      if (!schemaScript) {
        schemaScript = document.createElement('script')
        schemaScript.id = 'page-structured-data'
        schemaScript.type = 'application/ld+json'
        document.head.appendChild(schemaScript)
      }
      schemaScript.textContent = JSON.stringify(schemaData)
    } else if (schemaScript) {
      schemaScript.remove()
    }

    return () => {
      // Clean up dynamic schema script when component unmounts
      const scriptToRemove = document.getElementById('page-structured-data')
      if (scriptToRemove) {
        scriptToRemove.remove()
      }
    }
  }, [pageTitle, pageDescription, pageImage, type, fullCanonicalUrl, schemaData, storeName])

  return null
}
