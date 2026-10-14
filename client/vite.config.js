import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// CampusRide is now a Firebase client app (no Express backend proxy needed).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'pwa-192.png',
        'pwa-512.png',
        'maskable-192.png',
        'maskable-512.png',
        'apple-touch-icon.png',
        'assets/*.jpg',
      ],
      // Install prompt / home-screen metadata for Android, iOS and desktop.
      manifest: {
        id: '/',
        name: 'CampusRide — Smart Campus Transport',
        short_name: 'CampusRide',
        description:
          'Verified campus ride-sharing for college students and faculty.',
        lang: 'en',
        dir: 'ltr',
        categories: ['travel', 'transport', 'education'],
        theme_color: '#EA5858',
        background_color: '#0f172a',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        scope: '/',
        start_url: '/',
        prefer_related_applications: false,
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Book a ride',
            short_name: 'Book',
            url: '/home',
            icons: [{ src: '/pwa-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'My rides',
            short_name: 'History',
            url: '/history',
            icons: [{ src: '/pwa-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // Precache the built app shell. Runtime-cache map tiles so the map still
        // paints when offline-ish; Firestore/Auth calls are never cached.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Serve the SPA shell for any in-app navigation while offline.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('basemaps.cartocdn.com') ||
              url.hostname.endsWith('tile.openstreetmap.org') ||
              url.hostname.endsWith('maps.googleapis.com') ||
              url.hostname.endsWith('maps.gstatic.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
