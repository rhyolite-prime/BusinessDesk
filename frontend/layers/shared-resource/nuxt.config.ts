import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const layerDirectory = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  css: [resolve(layerDirectory, 'app/assets/css/main.css')],
})
