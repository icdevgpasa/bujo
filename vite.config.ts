import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app from /bujo/
const base = process.env.GITHUB_ACTIONS ? '/bujo/' : '/'

export default defineConfig({
  base,
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bujo – Bullet Journal',
        short_name: 'Bujo',
        description: 'Bullet Journal działający offline',
        lang: 'pl',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f1e7',
        theme_color: '#f6f1e7',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Serves calendar files for reminders; must run before the SPA fallback.
        importScripts: ['reminder-sw.js'],
        navigateFallbackDenylist: [/reminder\.ics/],
        // The celebration gif comes from Tenor; keep it after the first view
        // so it also shows offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/c\.tenor\.com\//,
            handler: 'CacheFirst',
            options: { cacheName: 'celebrate', cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
})
