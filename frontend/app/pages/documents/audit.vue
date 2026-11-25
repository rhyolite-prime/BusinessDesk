<script setup lang="ts">
import { useDocuments, useDocumentsUnitId } from '../../features/documents/useDocuments'
import type { DmAuditEvent } from '../../features/documents/document-types'

definePageMeta({ layout: 'admin-dm' })
useHead({ title: 'Audit Trail' })

const api = useDocuments()
const unitId = useDocumentsUnitId()

const events = ref<DmAuditEvent[]>([])
const loading = ref(false)
const verifying = ref(false)
const error = ref('')
const verifyResult = ref<{ verified: boolean; checkedCount: number; status: string } | null>(null)
const verifyModalOpen = ref(false)

const eventTypeFilter = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.audit({
      eventType: eventTypeFilter.value || undefined,
      size: 100,
    })
    events.value = res.data
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not load audit events.'
  } finally {
    loading.value = false
  }
}

async function handleVerifyChain() {
  verifying.value = true
  try {
    verifyResult.value = await api.verifyAudit()
    verifyModalOpen.value = true
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Audit verification failed.')
  } finally {
    verifying.value = false
  }
}

watch(unitId, load)
watch(eventTypeFilter, load)
onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <PageHeader
        title="Audit Trail Log"
        subtitle="Complete, tamper-evident record of all document actions, edits, approvals, and access."
        icon="clipboard-document-list"
      />
      <button
        type="button"
        :disabled="verifying"
        class="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-ink shadow-sm hover:border-primary/50 hover:text-primary disabled:opacity-50"
        @click="handleVerifyChain"
      >
        <svg class="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        {{ verifying ? 'Verifying...' : 'Verify SHA-256 Hash Chain' }}
      </button>
    </div>

    <!-- Verification Modal -->
    <div v-if="verifyModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
        <div class="flex items-center gap-3">
          <div
            :class="[
              'flex h-10 w-10 items-center justify-center rounded-xl',
              verifyResult?.verified
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400',
            ]"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-ink">Audit Integrity Status</h3>
            <p
              :class="[
                'text-xs font-semibold',
                verifyResult?.verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
              ]"
            >
              {{ verifyResult?.verified ? 'Cryptographic Chain Valid' : 'Integrity Mismatch Detected' }}
            </p>
          </div>
        </div>

        <div class="mt-4 space-y-2 rounded-xl bg-canvas p-3 text-xs">
          <div><span class="font-semibold text-ink">Report:</span> {{ verifyResult?.status }}</div>
          <div><span class="font-semibold text-ink">Events Checked:</span> {{ verifyResult?.checkedCount }} records</div>
          <div><span class="font-semibold text-ink">Chaining:</span> SHA-256 (prev_hash + event + payload)</div>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            type="button"
            class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90"
            @click="verifyModalOpen = false"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

    <!-- Filters -->
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 text-xs shadow-sm">
      <div class="flex items-center gap-2">
        <span class="font-bold text-ink-faint">Event type:</span>
        <select
          v-model="eventTypeFilter"
          class="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs text-ink"
        >
          <option value="">All events</option>
          <option value="document.created">Document Created</option>
          <option value="document.updated">Document Updated</option>
          <option value="document.deleted">Document Deleted</option>
          <option value="document.checked_out">Document Checked Out</option>
          <option value="document.checked_in">Document Checked In</option>
          <option value="document.locked">Document Locked</option>
          <option value="document.unlocked">Document Unlocked</option>
          <option value="document.reverted">Document Reverted</option>
          <option value="workflow.submitted">Workflow Submitted</option>
          <option value="workflow.approved">Workflow Approved</option>
          <option value="workflow.rejected">Workflow Rejected</option>
          <option value="document.note_added">Note Added</option>
          <option value="document.relation_added">Relation Linked</option>
          <option value="folder.created">Folder Created</option>
          <option value="folder.updated">Folder Updated</option>
          <option value="folder.deleted">Folder Deleted</option>
        </select>
      </div>

      <span class="text-ink-faint">{{ events.length }} events recorded</span>
    </div>

    <!-- Audit Event Table -->
    <div class="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
      <table class="w-full text-left text-xs">
        <thead class="border-b border-line bg-canvas/40 text-ink-faint">
          <tr>
            <th class="px-3 py-2.5">Timestamp</th>
            <th class="px-3 py-2.5">Event</th>
            <th class="px-3 py-2.5">Actor</th>
            <th class="px-3 py-2.5">Target document</th>
            <th class="px-3 py-2.5">Details</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="ev in events" :key="ev.id" class="hover:bg-canvas/20">
            <td class="px-3 py-2 text-ink-faint whitespace-nowrap">
              {{ new Date(ev.createdAt).toLocaleString() }}
            </td>
            <td class="px-3 py-2">
              <span class="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary">
                {{ ev.eventType }}
              </span>
            </td>
            <td class="px-3 py-2 font-medium text-ink">
              {{ ev.userName }}
            </td>
            <td class="px-3 py-2">
              <span v-if="ev.documentNumber" class="font-bold text-primary mr-1">{{ ev.documentNumber }}</span>
              <span v-if="ev.documentTitle" class="text-ink-soft">{{ ev.documentTitle }}</span>
              <span v-if="!ev.documentNumber && !ev.documentTitle" class="text-ink-faint">—</span>
            </td>
            <td class="px-3 py-2 text-ink-faint font-mono text-[11px]">
              {{ JSON.stringify(ev.details) }}
            </td>
          </tr>
          <tr v-if="!events.length">
            <td colspan="5" class="py-12 text-center text-ink-faint">
              No audit events found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
