import { useEffect } from 'react'

interface PwaConfig {
  name: string
  shortName: string
  startUrl: string
  themeColor?: string
  backgroundColor?: string
  iconUrl?: string | null
}

export function useDynamicPWA(config: PwaConfig | null) {
  useEffect(() => {
    if (!config) {
      // Revert to default if config is null
      resetToDefaultManifest()
      return
    }

    // 1. Update Apple Mobile Web App Title
    let appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')
    if (appleTitle) {
      appleTitle.setAttribute('content', config.shortName)
    }

    // 2. Update Apple Touch Icon
    if (config.iconUrl) {
      let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
      if (appleIcon) {
        appleIcon.setAttribute('href', config.iconUrl)
      } else {
        const link = document.createElement('link')
        link.rel = 'apple-touch-icon'
        link.href = config.iconUrl
        document.head.appendChild(link)
      }
    }

    // 3. Generate and inject dynamic manifest
    const manifest = {
      name: config.name,
      short_name: config.shortName,
      start_url: config.startUrl,
      display: 'standalone',
      background_color: config.backgroundColor || '#0f0a05',
      theme_color: config.themeColor || '#0f0a05',
      icons: config.iconUrl
        ? [
          {
            src: config.iconUrl,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
        : [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
    }

    const manifestString = JSON.stringify(manifest)
    const blob = new Blob([manifestString], { type: 'application/json' })
    const manifestUrl = URL.createObjectURL(blob)

    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (manifestLink) {
      // Store original href just in case
      if (!manifestLink.hasAttribute('data-original-href')) {
        manifestLink.setAttribute('data-original-href', manifestLink.getAttribute('href') || '/manifest.webmanifest')
      }
      manifestLink.setAttribute('href', manifestUrl)
    } else {
      manifestLink = document.createElement('link')
      manifestLink.rel = 'manifest'
      manifestLink.href = manifestUrl
      document.head.appendChild(manifestLink)
    }

    return () => {
      URL.revokeObjectURL(manifestUrl)
      resetToDefaultManifest()
    }
  }, [
    config?.name,
    config?.shortName,
    config?.startUrl,
    config?.themeColor,
    config?.backgroundColor,
    config?.iconUrl
  ])
}

function resetToDefaultManifest() {
  let appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')
  if (appleTitle) {
    appleTitle.setAttribute('content', 'Catalog')
  }

  let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
  if (appleIcon) {
    appleIcon.setAttribute('href', '/apple-touch-icon.png')
  }

  let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (manifestLink && manifestLink.hasAttribute('data-original-href')) {
    manifestLink.setAttribute('href', manifestLink.getAttribute('data-original-href') || '/manifest.webmanifest')
  }
}
