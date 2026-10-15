import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

/**
 * shared-resource layer
 * ─────────────────────
 * Inherited by every business module layer. Owns:
 *  - Tailwind v4 + white-label design tokens
 *  - The UI component kit, layout chrome (sidebar/topbar)
 *  - Framework composables (API client, navigation, toasts, formatting)
 *  - The mock core-banking database + Nitro API plumbing (server/)
 */
const layerRoot = fileURLToPath(new URL('.', import.meta.url))
const layerApp = fileURLToPath(new URL('./app', import.meta.url))

export default defineNuxtConfig({
  vite: { plugins: [tailwindcss()] },
  css: [fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url))],

  // Flat component auto-imports. Absolute path so it resolves inside the
  // layer regardless of which app/layer is resolving the config.
  components: [{ path: fileURLToPath(new URL('./app/components', import.meta.url)), pathPrefix: false }],

  // Auto-import composables & utils explicitly from this layer
  imports: {
    dirs: [
      fileURLToPath(new URL('./app/composables', import.meta.url)),
      fileURLToPath(new URL('./app/utils', import.meta.url)),
    ],
  },

  // Cross-layer import alias (types shared between client & server code)
  alias: { '@shared': layerApp },
  nitro: { alias: { '@shared': layerApp } },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
})
