<script setup lang="ts">
import type { DmDocument } from '../document-types'
import { useDocuments } from '../useDocuments'

const props = defineProps<{
  open: boolean
  document: DmDocument | null
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const api = useDocuments()
const loading = ref(false)
const error = ref('')

const actionType = ref<'submit' | 'approve' | 'reject' | 'cancel'>('submit')
const comments = ref('')
const publish = ref(false)
const stepName = ref('Document Review & Approval')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.document) {
      error.value = ''
      comments.value = ''
      publish.value = false
      stepName.value = 'Document Review & Approval'
      if (props.document.status === 'under_review') {
        actionType.value = 'approve'
      } else {
        actionType.value = 'submit'
      }
    }
  },
)

async function handleSubmit() {
  if (!props.document) return
  loading.value = true
  error.value = ''

  try {
    if (actionType.value === 'submit') {
      await api.submitWorkflow(props.document.id, { stepName: stepName.value })
    } else if (actionType.value === 'approve') {
      await api.approveWorkflow(props.document.id, { comments: comments.value, publish: publish.value })
    } else if (actionType.value === 'reject') {
      if (!comments.value.trim()) {
        error.value = 'Comments are required when rejecting a document.'
        loading.value = false
        return
      }
      await api.rejectWorkflow(props.document.id, { comments: comments.value.trim() })
    } else if (actionType.value === 'cancel') {
      await api.cancelWorkflow(props.document.id)
    }

    emit('updated')
    emit('close')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Workflow transition failed.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="`Workflow action: ${document?.title || ''}`"
    subtitle="Review and approval routing"
    width="max-w-md"
    @close="emit('close')"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div v-if="error" class="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
        {{ error }}
      </div>

      <div class="rounded-lg border border-line bg-canvas/40 p-3 text-xs">
        <span class="text-ink-faint">Current status:</span>
        <span class="ml-2 font-bold capitalize text-ink">{{ document?.status.replace('_', ' ') }}</span>
      </div>

      <!-- Action Selector -->
      <div>
        <label class="block text-xs font-semibold text-ink-soft">Action</label>
        <div class="mt-2 grid grid-cols-2 gap-2 text-xs">
          <button
            v-if="document?.status !== 'under_review'"
            type="button"
            class="rounded-lg border p-2.5 font-semibold transition"
            :class="actionType === 'submit' ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-ink hover:bg-canvas'"
            @click="actionType = 'submit'"
          >
            Submit for review
          </button>
          <button
            v-if="document?.status === 'under_review'"
            type="button"
            class="rounded-lg border p-2.5 font-semibold transition"
            :class="actionType === 'approve' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-line bg-surface text-ink hover:bg-canvas'"
            @click="actionType = 'approve'"
          >
            Approve
          </button>
          <button
            v-if="document?.status === 'under_review'"
            type="button"
            class="rounded-lg border p-2.5 font-semibold transition"
            :class="actionType === 'reject' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'border-line bg-surface text-ink hover:bg-canvas'"
            @click="actionType = 'reject'"
          >
            Reject
          </button>
          <button
            v-if="document?.status === 'under_review'"
            type="button"
            class="rounded-lg border p-2.5 font-semibold transition"
            :class="actionType === 'cancel' ? 'border-slate-500 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'border-line bg-surface text-ink hover:bg-canvas'"
            @click="actionType = 'cancel'"
          >
            Cancel review
          </button>
        </div>
      </div>

      <div v-if="actionType === 'submit'">
        <FormField label="Workflow step name">
          <TextInput v-model="stepName" placeholder="e.g. Legal & Compliance Review" required />
        </FormField>
      </div>

      <div v-if="actionType === 'approve'">
        <label class="flex items-center gap-2 text-xs font-semibold text-ink">
          <input v-model="publish" type="checkbox" class="h-4 w-4 rounded border-line text-primary focus:ring-primary" />
          Publish document immediately upon approval
        </label>
      </div>

      <div v-if="actionType === 'approve' || actionType === 'reject'">
        <FormField :label="actionType === 'reject' ? 'Rejection reason *' : 'Approval comments'">
          <TextareaInput
            v-model="comments"
            :placeholder="actionType === 'reject' ? 'Please state why this document was rejected...' : 'Optional review notes...'"
            :rows="3"
            :required="actionType === 'reject'"
          />
        </FormField>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2">
        <BaseButton variant="secondary" type="button" @click="emit('close')">
          Cancel
        </BaseButton>
        <BaseButton
          :variant="actionType === 'reject' ? 'danger' : 'primary'"
          type="submit"
          :disabled="loading"
        >
          {{ loading ? 'Saving...' : actionType === 'submit' ? 'Submit' : actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Cancel review' }}
        </BaseButton>
      </div>
    </form>
  </ModalShell>
</template>
