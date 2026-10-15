// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: false },
<<<<<<< Updated upstream
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
=======

  // ── Nuxt Layers ──────────────────────────────────────────────────────
  // shared-resource layer is inherited FIRST so every business module
  // below gets the theme, UI kit, composables, mock DB and API plumbing.
  extends: [
    './layers/shared',
    './layers/modules/auth',
    './layers/modules/dashboard',
    './layers/modules/clients',
    './layers/modules/groups',
    './layers/modules/loans',
    './layers/modules/savings',
    './layers/modules/products',
    './layers/modules/accounting',
    './layers/modules/organization',
    './layers/modules/system',
    './layers/modules/reports',
  ],

  devServer: { host: '0.0.0.0', port: 3000 },

  // Tenant / white-label defaults live in app.config.ts so an institution
  // only has to edit one file to re-brand the whole platform.
  future: { compatibilityVersion: 4 },
>>>>>>> Stashed changes
})
