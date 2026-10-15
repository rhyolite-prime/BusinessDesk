// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: false },

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
})
