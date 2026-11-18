<script setup lang="ts">
import type { DmFolder, DmTemplate } from '../document-types'
import { useDocuments } from '../useDocuments'

const props = defineProps<{
  open: boolean
  folders: DmFolder[]
  templates: DmTemplate[]
  defaultFolderId?: string | null
}>()

const emit = defineEmits<{
  close: []
  created: []
}>()

const api = useDocuments()
const loading = ref(false)
const error = ref('')

const title = ref('')
const fileName = ref('')
const folderId = ref('')
const templateId = ref('')
const language = ref('en')
const description = ref('')
const tagInput = ref('')
const contentText = ref('')
const customAttrs = ref<Record<string, any>>({})

const selectedTemplate = computed(() => props.templates.find((t) => t.id === templateId.value))

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      error.value = ''
      title.value = ''
      fileName.value = ''
      folderId.value = props.defaultFolderId || ''
      templateId.value = props.templates[0]?.id || ''
      language.value = 'en'
      description.value = ''
      tagInput.value = ''
      contentText.value = ''
      customAttrs.value = {}
    }
  },
)

watch(selectedTemplate, (t) => {
  customAttrs.value = {}
  if (t?.schema) {
    for (const f of t.schema) {
      customAttrs.value[f.name] = f.defaultValue ?? ''
    }
  }
})

function onFileSimulate(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    fileName.value = file.name
    if (!title.value) title.value = file.name.replace(/\.[^/.]+$/, '')
    const reader = new FileReader()
    reader.onload = () => {
      contentText.value = (reader.result as string) || ''
    }
    reader.readAsText(file)
  }
}

async function handleSubmit() {
  if (!title.value.trim()) {
    error.value = 'Document title is required.'
    return
  }
  loading.value = true
  error.value = ''

  const tags = tagInput.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  try {
    await api.createDocument({
      title: title.value.trim(),
      fileName: fileName.value.trim() || title.value.trim() + '.txt',
      folderId: folderId.value || undefined,
      templateId: templateId.value || undefined,
      language: language.value,
      description: description.value.trim(),
      tags,
      attributes: customAttrs.value,
      contentText: contentText.value,
      fileSize: contentText.value.length || 1024,
      mimeType: fileName.value.endsWith('.pdf')
        ? 'application/pdf'
        : fileName.value.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'text/plain',
    })
    emit('created')
    emit('close')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not upload document.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Upload new document"
    subtitle="Add a record to the enterprise document repository"
    width="max-w-xl"
    @close="emit('close')"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div v-if="error" class="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
        {{ error }}
      </div>

      <!-- File selection simulation -->
      <div>
        <label class="block text-xs font-semibold text-ink-soft">Select file</label>
        <input
          type="file"
          class="mt-1 block w-full text-xs text-ink-faint file:mr-3 file:rounded-lg file:border file:border-line file:bg-canvas file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink hover:file:bg-primary-soft/50"
          @change="onFileSimulate"
        />
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Document title *" required>
          <TextInput v-model="title" placeholder="e.g. Master Services Agreement" required />
        </FormField>
        <FormField label="File name">
          <TextInput v-model="fileName" placeholder="e.g. MSA_2026.pdf" />
        </FormField>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Folder">
          <select
            v-model="folderId"
            class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink"
          >
            <option value="">Root / Unfiled</option>
            <option v-for="f in folders" :key="f.id" :value="f.id">
              {{ f.path }}{{ f.name }}
            </option>
          </select>
        </FormField>

        <FormField label="Document template / type">
          <select
            v-model="templateId"
            class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink"
          >
            <option value="">General (No schema)</option>
            <option v-for="t in templates" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
        </FormField>
      </div>

      <!-- Dynamic Custom Metadata Fields -->
      <div v-if="selectedTemplate?.schema?.length" class="rounded-xl border border-line bg-canvas/30 p-3 space-y-3">
        <p class="text-xs font-bold uppercase tracking-wider text-primary">{{ selectedTemplate.name }} metadata</p>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div v-for="f in selectedTemplate.schema" :key="f.name">
            <label class="block text-[11px] font-semibold text-ink-soft">
              {{ f.label }} <span v-if="f.required" class="text-red-500">*</span>
            </label>
            <select
              v-if="f.type === 'select'"
              v-model="customAttrs[f.name]"
              class="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
            >
              <option value="">Select {{ f.label }}...</option>
              <option v-for="opt in f.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input
              v-else-if="f.type === 'boolean'"
              v-model="customAttrs[f.name]"
              type="checkbox"
              class="mt-1.5 h-4 w-4 rounded border-line text-primary focus:ring-primary"
            />
            <input
              v-else
              v-model="customAttrs[f.name]"
              :type="f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'"
              class="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
            />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Language">
          <select
            v-model="language"
            class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink"
          >
            <option value="en">English (en)</option>
            <option value="fr">French (fr)</option>
            <option value="es">Spanish (es)</option>
            <option value="de">German (de)</option>
            <option value="zh">Chinese (zh)</option>
            <option value="ar">Arabic (ar)</option>
          </select>
        </FormField>

        <FormField label="Tags (comma-separated)">
          <TextInput v-model="tagInput" placeholder="e.g. contract, legal, q4" />
        </FormField>
      </div>

      <FormField label="Description">
        <TextareaInput v-model="description" placeholder="Brief summary of document purpose..." :rows="2" />
      </FormField>

      <FormField label="Content / text preview">
        <TextareaInput v-model="contentText" placeholder="Paste or type document content text for full-text search indexing..." :rows="3" />
      </FormField>

      <div class="flex items-center justify-end gap-2 pt-2">
        <BaseButton variant="secondary" type="button" @click="emit('close')">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" type="submit" :disabled="loading">
          {{ loading ? 'Uploading...' : 'Save document' }}
        </BaseButton>
      </div>
    </form>
  </ModalShell>
</template>
