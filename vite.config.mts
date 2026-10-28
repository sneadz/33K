import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { auth, getState, memoryStore, setProgress } from './api/_core.js'

// En local (`npm run dev`), les routes /api tournent en mémoire : pas besoin de Redis.
function devApi(): Plugin {
  const store = memoryStore()
  return {
    name: '33k-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        let raw = ''
        for await (const chunk of req) raw += chunk
        const body = raw ? JSON.parse(raw) : undefined
        const route = req.url.split('?')[0]
        const result =
          route === '/api/state' ? await getState(store)
          : route === '/api/auth' ? await auth(store, body)
          : route === '/api/progress' ? await setProgress(store, body)
          : { status: 404, body: { error: 'Route inconnue.' } }
        res.statusCode = result.status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(result.body))
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    devApi(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '33K',
        short_name: '33K',
        description: 'Suivi des camos MW4 entre potes : Gold, Platinum, Harmonic Break et mastery.',
        lang: 'fr',
        theme_color: '#1b1f17',
        background_color: '#1b1f17',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
