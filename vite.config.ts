import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'favicon-16.png', 'apple-touch-icon.png', 'offline.html'],
      manifest: {
        name: 'Catalog by Cyrus',
        short_name: 'Catalog',
        description: 'Discover Amazing Products Brought to you By Cyrus',
        theme_color: '#0f0a05',
        background_color: '#0f0a05',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // When a navigation request fails (truly offline + not in cache), fall
        // back to the standalone offline page instead of showing the browser's
        // generic dino/error.
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/admin/, /^\/api\//],
        runtimeCaching: [
          // Supabase Postgrest reads (products / categories / settings):
          // stale-while-revalidate so the storefront paints instantly from the
          // last known snapshot and quietly refreshes in the background.
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-rest',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Supabase storage objects (uploaded product images): cache-first with
          // a long TTL — they're content-addressed by filename, so once you have
          // a copy you can keep it.
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/v1/object/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Any other image URL (placeholder.co, external CDN) — same idea but
          // shorter window since we don't own these.
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-images',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    })
  ],
  build: {
    modulePreload: {
      resolveDependencies(_filename, deps) {
        return deps.filter(dep => !dep.includes('/motion-'))
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('@tanstack')) return 'react-query'
          if (id.includes('react-router-dom')) return 'router'
          if (id.includes('framer-motion')) return 'motion'

          return 'vendor'
        },
      },
    },
  },
})
