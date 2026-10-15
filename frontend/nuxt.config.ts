// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: false },

  // Compose the ERP design system and authentication layer only. The legacy
  // core-banking feature layers remain in the repository but are not mounted
  // into the ERP app; workspaces are defined by the ERP module catalog.
  extends: [
    './layers/shared',
    './layers/shared-resource',
    './layers/modules/auth',
  ],

  imports: {
    dirs: [
      fileURLToPath(new URL('./layers/shared/app/composables', import.meta.url)),
      fileURLToPath(new URL('./layers/shared/app/utils', import.meta.url)),
    ],
  },

  devServer: { host: '0.0.0.0', port: 3000 },
  vite: {
    optimizeDeps: {
      include: [
        '@lucide/vue',
        'echarts/charts',
        'echarts/components',
        'echarts/core',
        'echarts/renderers',
      ],
    },
  },
  future: { compatibilityVersion: 4 },

  // Server-only upstream URLs. Browser requests stay same-origin under /api.
  runtimeConfig: {
    ledgerApiBaseUrl: process.env.LEDGER_API_BASE_URL || '',
    authApiBaseUrl: process.env.AUTH_API_BASE_URL || '',
    // Mock sign-in defaults on for development navigation; the server rejects it outside NODE_ENV=development.
    authDemoMode: process.env.AUTH_DEMO_MODE !== 'false',
    public: {
      demoMode: process.env.NUXT_PUBLIC_DEMO_MODE === 'true',
    },
  },
  app: {
    head: {
      titleTemplate: '%s · BusinessDesk',
      title: 'BusinessDesk ERP',
      meta: [
        { name: 'description', content: 'BusinessDesk ERP workspaces for finance, operations, people, and industry workflows.' },
        { name: 'theme-color', content: '#f7f8fa' },
      ],
    },
  },

  typescript: {
    strict: true,
    // The Nuxt CLI typecheck and production build validate types; skip the
    // dev-server checker, which mis-resolves Nuxt's generated app/server globals.
    typeCheck: 'build',
  },
})
