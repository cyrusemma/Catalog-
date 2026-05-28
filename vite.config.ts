import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'favicon-16.png', 'apple-touch-icon.png'],
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
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-cache', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 } }
          }
        ]
      }
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
