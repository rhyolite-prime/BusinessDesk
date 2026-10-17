import { fileURLToPath } from 'node:url'

/** BusinessDesk navigation chrome layered on top of the shared design system. */
export default defineNuxtConfig({
  components: [
    { path: fileURLToPath(new URL('./app/components', import.meta.url)), pathPrefix: false },
  ],
})
