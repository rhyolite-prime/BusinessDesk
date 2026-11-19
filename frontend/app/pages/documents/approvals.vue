<script setup lang="ts">
import { useDocuments, useDocumentsUnitId } from '../../features/documents/useDocuments'
import type { DmWorkflow, DmDocument } from '../../features/documents/document-types'
import WorkflowModal from '../../features/documents/components/WorkflowModal.vue'

definePageMeta({ layout: 'admin-dm' })
useHead({ title: 'Approval Workflows' })

const api = useDocuments()
const unitId = useDocumentsUnitId()

const workflows = ref<DmWorkflow[]>([])
const loading = ref(false)
const error = ref('')
const statusFilter = ref('pending')

const workflowModalOpen = ref(false)
const activeDoc = ref<DmDocument | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.workflows({
      status: statusFilter.value || undefined,
      size: 50,
    })
    workflows.value = res.data
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not load approval workflows.'
  } finally {
    loading.value = false
  }
}

watch(unitId, load)
watch(statusFilter, load)
onMounted(load)

async function openReview(wf: DmWorkflow) {
  try {
    const doc = await api.document(wf.documentId)
    activeDoc.value = doc
    workflowModalOpen.value = true
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not load document for review.')
  }
}

async function quickApprove(wf: DmWorkflow) {
  try {
    await api.approveWorkflow(wf.documentId, { comments: 'Approved via task queue' })
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Approval failed.')
  }
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader
      title="Review & Approval Workflows"
      subtitle="Operational approval queue for pending documents, compliance checks, and decision audits."
      icon="document-check"
    />

    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

    <!-- Filters -->
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 text-xs shadow-sm">
      <div class="flex items-center gap-2">
        <span class="font-bold text-ink-faint">Status:</span>
        <button
          type="button"
          class="rounded-lg px-3 py-1 font-semibold transition"
          :class="statusFilter === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-canvas text-ink-soft hover:text-ink'"
          @click="statusFilter = 'pending'"
        >
          Pending review
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1 font-semibold transition"
          :class="statusFilter === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-canvas text-ink-soft hover:text-ink'"
          @click="statusFilter = 'approved'"
        >
          Approved
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1 font-semibold transition"
          :class="statusFilter === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' : 'bg-canvas text-ink-soft hover:text-ink'"
          @click="statusFilter = 'rejected'"
        >
          Rejected
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1 font-semibold transition"
          :class="statusFilter === '' ? 'bg-primary-soft text-primary' : 'bg-canvas text-ink-soft hover:text-ink'"
          @click="statusFilter = ''"
        >
          All
        </button>
      </div>

      <span class="text-ink-faint">{{ workflows.length }} items</span>
    </div>

    <!-- Workflow Table -->
    <div class="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
      <table class="w-full text-left text-xs">
        <thead class="border-b border-line bg-canvas/40 text-ink-faint">
          <tr>
            <th class="px-3 py-2.5">Document #</th>
            <th class="px-3 py-2.5">Title</th>
            <th class="px-3 py-2.5">Workflow step</th>
            <th class="px-3 py-2.5">Revision</th>
            <th class="px-3 py-2.5">Status</th>
            <th class="px-3 py-2.5">Submitted by</th>
            <th class="px-3 py-2.5">Date</th>
            <th class="px-3 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="wf in workflows" :key="wf.id" class="hover:bg-canvas/20">
            <td class="px-3 py-2 font-mono font-bold text-primary">
              {{ wf.documentNumber }}
            </td>
            <td class="px-3 py-2 font-semibold text-ink">
              {{ wf.documentTitle }}
            </td>
            <td class="px-3 py-2 text-ink-soft">
              {{ wf.stepName }}
            </td>
            <td class="px-3 py-2">
              <span class="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                v{{ wf.versionLabel }}
              </span>
            </td>
            <td class="px-3 py-2">
              <Badge :variant="wf.status === 'approved' ? 'success' : wf.status === 'rejected' ? 'danger' : 'warning'">
                {{ wf.status }}
              </Badge>
            </td>
            <td class="px-3 py-2 text-ink-faint">
              {{ wf.creatorName || 'System' }}
            </td>
            <td class="px-3 py-2 text-ink-faint">
              {{ new Date(wf.createdAt).toLocaleDateString() }}
            </td>
            <td class="px-3 py-2 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  v-if="wf.status === 'pending'"
                  type="button"
                  class="font-semibold text-emerald-600 hover:underline"
                  @click="quickApprove(wf)"
                >
                  Quick approve
                </button>
                <BaseButton size="sm" variant="secondary" @click="openReview(wf)">
                  Review
                </BaseButton>
              </div>
            </td>
          </tr>
          <tr v-if="!workflows.length">
            <td colspan="8" class="py-12 text-center text-ink-faint">
              No workflow tasks in this view.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Review Modal -->
    <WorkflowModal
      :open="workflowModalOpen"
      :document="activeDoc"
      @close="workflowModalOpen = false"
      @updated="load"
    />
  </section>
</template>
