import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  extends: ['./layers/shared-resource'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: [],
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    // Server-only upstream URL. Browser requests stay same-origin under /api/ledger.
    ledgerApiBaseUrl: process.env.LEDGER_API_BASE_URL || '',
    public: {
      demoMode: process.env.NUXT_PUBLIC_DEMO_MODE === 'true',
    },
  },
  app: {
    head: {
      titleTemplate: '%s · BusinessDesk',
      title: 'General Ledger',
      meta: [
        { name: 'description', content: 'BusinessDesk General Ledger' },
        { name: 'theme-color', content: '#f7f8fa' },
      ],
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
})
