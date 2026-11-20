<script setup lang="ts">
import type { DmDocument } from '../document-types'
import { useDocuments } from '../useDocuments'

const props = defineProps<{
  open: boolean
  document: DmDocument | null
}>()

const emit = defineEmits<{
  close: []
  checkedIn: []
}>()

const api = useDocuments()
const loading = ref(false)
const error = ref('')

const isMajor = ref(false)
const fileName = ref('')
const comment = ref('')
const contentText = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.document) {
      error.value = ''
      isMajor.value = false
      fileName.value = props.document.fileName
      comment.value = ''
      contentText.value = props.document.contentText || ''
    }
  },
)

async function handleSubmit() {
  if (!props.document) return
  loading.value = true
  error.value = ''

  try {
    await api.checkinDocument(props.document.id, {
      fileName: fileName.value.trim() || props.document.fileName,
      fileSize: contentText.value.length || 1024,
      isMajor: isMajor.value,
      comment: comment.value.trim() || (isMajor.value ? 'Major version increment' : 'Minor update'),
      contentText: contentText.value,
    })
    emit('checkedIn')
    emit('close')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not check in document.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="`Check in: ${document?.title || ''}`"
    subtitle="Upload new revision and release document lock"
    width="max-w-lg"
    @close="emit('close')"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div v-if="error" class="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
        {{ error }}
      </div>

      <div class="rounded-lg border border-line bg-canvas/40 p-3 text-xs">
        <span class="text-ink-faint">Current version:</span>
        <span class="ml-2 font-bold text-ink">v{{ document?.versionLabel }}</span>
        <span class="mx-2 text-ink-faint">→</span>
        <span class="text-ink-faint">New version:</span>
        <span class="ml-2 font-bold text-primary">
          v{{ isMajor ? (parseInt(document?.versionLabel || '1') + 1) + '.0' : document?.versionLabel ? (document.versionLabel.split('.')[0] + '.' + (parseInt(document.versionLabel.split('.')[1] || '0') + 1)) : '1.1' }}
        </span>
      </div>

      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 text-xs font-semibold text-ink">
          <input v-model="isMajor" type="checkbox" class="h-4 w-4 rounded border-line text-primary focus:ring-primary" />
          Major version revision (e.g. 1.x → 2.0)
        </label>
      </div>

      <FormField label="File name">
        <TextInput v-model="fileName" placeholder="Updated file name..." required />
      </FormField>

      <FormField label="Revision changelog / comments *">
        <TextareaInput v-model="comment" placeholder="What changed in this revision? (e.g. Added section 4 indemnification)" :rows="2" required />
      </FormField>

      <FormField label="Updated content text">
        <TextareaInput v-model="contentText" placeholder="New document content..." :rows="3" />
      </FormField>

      <div class="flex items-center justify-end gap-2 pt-2">
        <BaseButton variant="secondary" type="button" @click="emit('close')">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" type="submit" :disabled="loading">
          {{ loading ? 'Checking in...' : 'Check in revision' }}
        </BaseButton>
      </div>
    </form>
  </ModalShell>
</template>
