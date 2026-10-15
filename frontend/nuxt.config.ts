// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: false },
  modules: [],
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    // Server-only upstream URLs. Browser requests stay same-origin under /api.
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
    typeCheck: true,
  },
})
