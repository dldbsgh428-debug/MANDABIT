import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // 하위 경로에 올려도 동작하도록 상대 경로로 뽑는다.
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // 매니페스트는 플러그인이 생성한다 — public 쪽 사본과 어긋나지 않게.
      manifest: {
        name: 'HABITUS · 아비투스 기록',
        short_name: 'HABITUS',
        description: '일곱 가지 자본에 시간을 어떻게 쓰는지 기록하는 앱',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f7f6',
        theme_color: '#f6f7f6',
        icons: [
          { src: './icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: './icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: './icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 앱 껍데기를 통째로 캐시해 두면 비행기 모드에서도 그대로 열린다.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
})
