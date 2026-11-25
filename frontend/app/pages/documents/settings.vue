<script setup lang="ts">
import { useDocuments } from '../../features/documents/useDocuments'
import type { DmQuota, DmSettings } from '../../features/documents/document-types'

definePageMeta({ layout: 'admin-dm' })
useHead({ title: 'DMS Settings & Quotas' })

const api = useDocuments()

const quota = ref<DmQuota | null>(null)
const settings = ref<DmSettings | null>(null)
const loading = ref(false)
const saving = ref(false)
const message = ref('')

async function load() {
  loading.value = true
  message.value = ''
  try {
    const [q, s] = await Promise.all([
      api.quotas().catch(() => null),
      api.settings().catch(() => null),
    ])
    quota.value = q
    settings.value = s || {
      storageProvider: 'local',
      clamavEnabled: false,
      clamavHost: '127.0.0.1',
      clamavPort: 3310,
      piiDetectionEnabled: true,
      ocrEnabled: false,
      ocrLanguage: 'eng',
      aiClassificationEnabled: true,
      aiRagEnabled: true,
      defaultRetentionDays: 365,
    }
  } finally {
    loading.value = false
  }
}

async function handleSaveSettings() {
  if (!settings.value) return
  saving.value = true
  message.value = ''
  try {
    await api.updateSettings(settings.value)
    message.value = 'Settings saved successfully.'
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not save settings.')
  } finally {
    saving.value = false
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-ink">DMS Settings & Quotas</h1>
      <p class="text-sm text-ink-soft">
        Configure tenant storage provider, ClamAV INSTREAM virus scanning, OCR text extraction, regex PII protection, and storage quotas.
      </p>
    </div>

    <div v-if="message" class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300">
      {{ message }}
    </div>

    <!-- Quotas Card -->
    <div v-if="quota" class="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <h2 class="text-base font-bold text-ink">Tenant Storage & Quotas</h2>
      <p class="text-xs text-ink-soft">Allocated disk space and document counts for this tenant.</p>

      <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div class="rounded-xl bg-canvas p-4">
          <p class="text-xs text-ink-soft">Storage Used</p>
          <p class="mt-1 text-xl font-bold text-ink">{{ formatBytes(quota.usedStorageBytes) }}</p>
          <p class="mt-1 text-xs text-ink-soft">of {{ formatBytes(quota.maxStorageBytes) }}</p>
          <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              class="h-full bg-primary"
              :style="{ width: `${Math.min(100, quota.storagePercent || 0)}%` }"
            />
          </div>
        </div>

        <div class="rounded-xl bg-canvas p-4">
          <p class="text-xs text-ink-soft">Documents</p>
          <p class="mt-1 text-xl font-bold text-ink">{{ quota.documentCount }}</p>
          <p class="mt-1 text-xs text-ink-soft">limit: {{ quota.maxDocuments }}</p>
        </div>

        <div class="rounded-xl bg-canvas p-4">
          <p class="text-xs text-ink-soft">Max Single File Size</p>
          <p class="mt-1 text-xl font-bold text-ink">{{ formatBytes(quota.maxFileSizeBytes) }}</p>
          <p class="mt-1 text-xs text-ink-soft">per document upload</p>
        </div>
      </div>
    </div>

    <!-- Settings Form -->
    <form v-if="settings" class="space-y-6" @submit.prevent="handleSaveSettings">
      <!-- Storage Provider -->
      <div class="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h2 class="text-base font-bold text-ink">Pluggable Storage Provider</h2>
        <p class="text-xs text-ink-soft">Select the backend file storage adapter.</p>

        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label
            :class="[
              'cursor-pointer rounded-xl border p-4 text-xs font-semibold transition',
              settings.storageProvider === 'local' ? 'border-primary bg-primary/5 text-primary' : 'border-line text-ink',
            ]"
          >
            <input v-model="settings.storageProvider" type="radio" value="local" class="sr-only" />
            <span class="block text-sm font-bold">Local FileSystem</span>
            <span class="mt-1 block font-normal text-ink-soft">Secure hashed filesystem storage</span>
          </label>

          <label
            :class="[
              'cursor-pointer rounded-xl border p-4 text-xs font-semibold transition',
              settings.storageProvider === 'cloudinary' ? 'border-primary bg-primary/5 text-primary' : 'border-line text-ink',
            ]"
          >
            <input v-model="settings.storageProvider" type="radio" value="cloudinary" class="sr-only" />
            <span class="block text-sm font-bold">Cloudinary</span>
            <span class="mt-1 block font-normal text-ink-soft">Cloudinary cloud asset storage</span>
          </label>

          <label
            :class="[
              'cursor-pointer rounded-xl border p-4 text-xs font-semibold transition',
              settings.storageProvider === 's3' ? 'border-primary bg-primary/5 text-primary' : 'border-line text-ink',
            ]"
          >
            <input v-model="settings.storageProvider" type="radio" value="s3" class="sr-only" />
            <span class="block text-sm font-bold">AWS S3 / MinIO</span>
            <span class="mt-1 block font-normal text-ink-soft">Object storage compatible API</span>
          </label>
        </div>
      </div>

      <!-- Security & Scanning -->
      <div class="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
        <h2 class="text-base font-bold text-ink">Security & Ingestion Scanning</h2>

        <div class="flex items-center justify-between rounded-xl bg-canvas p-4">
          <div>
            <p class="text-sm font-semibold text-ink">ClamAV INSTREAM Malware Scanning</p>
            <p class="text-xs text-ink-soft">Scan uploads in real-time over TCP streaming socket before persisting</p>
          </div>
          <input v-model="settings.clamavEnabled" type="checkbox" class="h-4 w-4 rounded border-line" />
        </div>

        <div class="flex items-center justify-between rounded-xl bg-canvas p-4">
          <div>
            <p class="text-sm font-semibold text-ink">Personally Identifiable Information (PII) Detection</p>
            <p class="text-xs text-ink-soft">Regex scanning for SSNs, credit cards (Luhn check), and emails with auto-redaction</p>
          </div>
          <input v-model="settings.piiDetectionEnabled" type="checkbox" class="h-4 w-4 rounded border-line" />
        </div>

        <div class="flex items-center justify-between rounded-xl bg-canvas p-4">
          <div>
            <p class="text-sm font-semibold text-ink">Tesseract OCR Text Extraction Fallback</p>
            <p class="text-xs text-ink-soft">Perform optical character recognition on scanned images and image-only PDFs</p>
          </div>
          <input v-model="settings.ocrEnabled" type="checkbox" class="h-4 w-4 rounded border-line" />
        </div>
      </div>

      <!-- AI Features -->
      <div class="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
        <h2 class="text-base font-bold text-ink">Deterministic AI Engine</h2>

        <div class="flex items-center justify-between rounded-xl bg-canvas p-4">
          <div>
            <p class="text-sm font-semibold text-ink">Heuristic Document Classification</p>
            <p class="text-xs text-ink-soft">Auto-classify incoming documents (Invoice, Contract, Report, Policy, Spec)</p>
          </div>
          <input v-model="settings.aiClassificationEnabled" type="checkbox" class="h-4 w-4 rounded border-line" />
        </div>

        <div class="flex items-center justify-between rounded-xl bg-canvas p-4">
          <div>
            <p class="text-sm font-semibold text-ink">Extractive RAG with 256-dim FNV-1a Embeddings</p>
            <p class="text-xs text-ink-soft">Enable semantic vector retrieval with exact chunk and page citations</p>
          </div>
          <input v-model="settings.aiRagEnabled" type="checkbox" class="h-4 w-4 rounded border-line" />
        </div>
      </div>

      <div class="flex justify-end">
        <button
          type="submit"
          :disabled="saving"
          class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {{ saving ? 'Saving...' : 'Save DMS settings' }}
        </button>
      </div>
    </form>
  </div>
</template>
