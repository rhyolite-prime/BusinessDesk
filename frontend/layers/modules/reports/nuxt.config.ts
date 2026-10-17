import { fileURLToPath } from 'node:url'

// Module layer — inherits shared-resource layer via the root extends chain.
export default defineNuxtConfig({
  components: [
    { path: fileURLToPath(new URL('./app/components', import.meta.url)), pathPrefix: false },
  ],
})
