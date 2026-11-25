<script setup lang="ts">
import { useDocuments } from '../../features/documents/useDocuments'
import type { DmLegalHold } from '../../features/documents/document-types'

definePageMeta({ layout: 'admin-dm' })
useHead({ title: 'Litigation Legal Holds' })

const api = useDocuments()

const holds = ref<DmLegalHold[]>([])
const loading = ref(false)
const error = ref('')
const createModalOpen = ref(false)

const form = reactive({
  matterNumber: '',
  title: '',
  description: '',
  custodianName: '',
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    holds.value = await api.legalHolds()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not load legal holds.'
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!form.matterNumber.trim() || !form.title.trim()) return
  try {
    await api.createLegalHold({
      matterNumber: form.matterNumber.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      custodianName: form.custodianName.trim(),
    })
    createModalOpen.value = false
    form.matterNumber = ''
    form.title = ''
    form.description = ''
    form.custodianName = ''
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not create legal hold.')
  }
}

async function handleRelease(hold: DmLegalHold) {
  if (!confirm(`Are you sure you want to release legal hold "${hold.matterNumber}: ${hold.title}"? Documents will return to standard retention lifecycle.`)) return
  try {
    await api.releaseLegalHold(hold.id)
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not release legal hold.')
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Litigation Legal Holds</h1>
        <p class="text-sm text-ink-soft">
          Preservation freezes protecting sensitive records from automated retention disposition or deletion during regulatory audits and litigation.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
        @click="createModalOpen = true"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Create legal hold
      </button>
    </div>

    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
      {{ error }}
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-ink-soft">
      Loading legal holds...
    </div>

    <div v-else-if="!holds.length" class="rounded-2xl border border-dashed border-line p-12 text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
      </div>
      <h3 class="mt-3 text-base font-semibold text-ink">No active legal holds</h3>
      <p class="mt-1 text-sm text-ink-soft">No preservation freezes have been applied to documents in this repository.</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="hold in holds"
        :key="hold.id"
        class="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-primary/40"
      >
        <div>
          <div class="flex items-center justify-between">
            <span class="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
              {{ hold.matterNumber }}
            </span>
            <span
              :class="[
                'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                hold.status === 'active'
                  ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
              ]"
            >
              {{ hold.status }}
            </span>
          </div>
          <h3 class="mt-3 text-base font-bold text-ink">{{ hold.title }}</h3>
          <p class="mt-1 text-xs text-ink-soft line-clamp-2">{{ hold.description || 'No description provided.' }}</p>
          <p v-if="hold.custodianName" class="mt-2 text-xs text-ink">
            <span class="text-ink-soft">Custodian:</span> {{ hold.custodianName }}
          </p>
        </div>

        <div class="mt-5 flex items-center justify-between border-t border-line/60 pt-3 text-xs text-ink-soft">
          <span>{{ hold.attachedDocumentCount || 0 }} frozen docs</span>
          <button
            v-if="hold.status === 'active'"
            type="button"
            class="text-red-600 hover:underline"
            @click="handleRelease(hold)"
          >
            Release hold
          </button>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="createModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
        <h3 class="text-lg font-bold text-ink">Apply New Legal Hold</h3>
        <p class="text-xs text-ink-soft">Freeze records for litigation or regulatory compliance.</p>

        <form class="mt-4 space-y-4" @submit.prevent="handleCreate">
          <div>
            <label class="block text-xs font-semibold text-ink">Matter / Case Number</label>
            <input
              v-model="form.matterNumber"
              type="text"
              required
              class="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
              placeholder="e.g. LIT-2026-089"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-ink">Title</label>
            <input
              v-model="form.title"
              type="text"
              required
              class="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
              placeholder="e.g. Q4 Tax Audit Inquiries"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-ink">Custodian Name</label>
            <input
              v-model="form.custodianName"
              type="text"
              class="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
              placeholder="e.g. Legal Compliance Counsel"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-ink">Scope Description</label>
            <textarea
              v-model="form.description"
              rows="3"
              class="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
              placeholder="Preservation requirements..."
            />
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-slate-50 dark:hover:bg-slate-800"
              @click="createModalOpen = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90"
            >
              Apply legal hold
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
