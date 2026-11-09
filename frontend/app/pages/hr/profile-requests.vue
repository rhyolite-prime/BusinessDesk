<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'
definePageMeta({ layout: 'admin-hr' })
useHead({ title: 'Profile requests · Human Resources' })
type Row = { source: 'employee' | 'admin'; id: string; employeeName: string; employeeIdentifier: string; changes: Record<string, string>; status: string; decisionNote: string; createdAt: string; version: number; canDecide: boolean }
const labels: Record<string, string> = { personalEmail: 'Personal email', primaryPhoneNumber: 'Primary phone', secondaryPhoneNumber: 'Secondary phone', residenceAddress: 'Residential address', cityOrLocation: 'City or location' }
const request = useRequestFetch(), { user } = useBusinessDeskAuth()
const rows = ref<Row[]>([]), page = ref(1), total = ref(0), canReview = ref(false), canSubmit = ref(false), loading = ref(false), busy = ref(false), error = ref(''), notice = ref('')
const decision = ref<{ row: Row; action: 'approve' | 'reject' } | null>(null), note = ref('')
let generation = 0, lifecycle = 0
async function load() {
  const current = ++generation
  loading.value = true; error.value = ''
  try {
    const data = await request<{ data: Row[]; totalCount: number; canReview: boolean; canSubmit: boolean }>('/api/hr/profile/requests', { query: { page: page.value } })
    if (current !== generation) return
    rows.value = data.data; total.value = data.totalCount; canReview.value = data.canReview; canSubmit.value = data.canSubmit
  } catch (e: any) { if (current === generation) { rows.value = []; total.value = 0; canReview.value = false; canSubmit.value = false; error.value = e?.data?.statusMessage || 'Unable to load requests.' } }
  finally { if (current === generation) loading.value = false }
}
function open(row: Row, action: 'approve' | 'reject') { decision.value = { row, action }; note.value = ''; error.value = ''; notice.value = '' }
async function submit() {
  if (!decision.value || busy.value) return
  const current = lifecycle, { row, action } = decision.value
  busy.value = true; error.value = ''
  try {
    await request(`/api/hr/profile/requests/${row.id}/${action}` as string, { method: 'POST', body: { version: row.version, note: note.value } })
    if (current !== lifecycle) return
    decision.value = null; await load(); if (current === lifecycle) notice.value = 'Decision saved.'
  } catch (e: any) { if (current === lifecycle) error.value = e?.data?.statusMessage || 'Unable to save the decision.' }
  finally { if (current === lifecycle) busy.value = false }
}
watch(() => `${user.value?.accountId}:${user.value?.username}`, () => { ++lifecycle; ++generation; rows.value = []; total.value = 0; canReview.value = false; canSubmit.value = false; busy.value = false; decision.value = null; note.value = ''; page.value = 1; notice.value = ''; error.value = ''; load() })
onMounted(load)
onBeforeUnmount(() => { ++lifecycle; ++generation })
</script>
<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-[.16em] text-primary">People / Administration</p><h1 class="mt-2 text-3xl font-semibold tracking-tight">Contact change review</h1><p class="mt-2 text-sm text-ink-soft">Review contact changes across the organization. A different authorized reviewer must decide each request.</p></div><NuxtLink v-if="canSubmit" to="/hr/profile-changes" class="text-sm font-semibold text-primary">New contact change →</NuxtLink></header>
    <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p><p v-if="notice" role="status" class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{{ notice }}</p>
    <form v-if="decision" class="space-y-3 rounded-2xl border border-line bg-surface p-5" @submit.prevent="submit"><h2 class="font-semibold capitalize">{{ decision.action }} request for {{ decision.row.employeeName }}?</h2><p class="text-sm text-ink-soft">Approval applies only the requested fields, provided the employee record has not changed since submission.</p><label for="decision-note" class="block text-xs font-semibold">Decision note (optional)</label><textarea id="decision-note" v-model="note" maxlength="500" rows="2" class="field" /><div class="flex gap-2"><button :disabled="busy" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Confirm {{ decision.action }}</button><button type="button" class="secondary" @click="decision = null">Go back</button></div></form>
    <section class="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"><div class="flex items-center justify-between border-b border-line p-5"><p class="text-xs text-ink-faint">{{ total }} requests</p><button class="secondary" :disabled="loading" @click="load"><RefreshCw :size="14" class="mr-1 inline" /> Refresh</button></div><div v-if="loading" class="p-8 text-center text-sm text-ink-faint">Loading…</div><div v-else-if="!rows.length" class="p-8 text-center text-sm text-ink-faint">{{ error ? 'Requests could not be loaded.' : 'No requests yet.' }}</div><div v-else class="overflow-x-auto"><table class="w-full min-w-[760px] text-left text-sm"><thead class="bg-canvas text-xs text-ink-faint"><tr><th class="p-4">Employee</th><th class="p-4">Requested changes</th><th class="p-4">Source</th><th class="p-4">Status</th><th class="p-4">Decision note</th><th class="p-4">Actions</th></tr></thead><tbody><tr v-for="row in rows" :key="row.id" class="border-t border-line align-top"><td class="p-4"><strong>{{ row.employeeName }}</strong><div class="mt-1 text-xs text-ink-faint">{{ row.employeeIdentifier }}</div></td><td class="max-w-xs break-words p-4 text-xs"><div v-for="(value, key) in row.changes" :key="key" class="mb-2"><span class="font-semibold">{{ labels[key] || key }}:</span> {{ value || '(clear)' }}</div></td><td class="p-4 text-xs text-ink-soft">{{ row.source === 'employee' ? 'Legacy employee request' : 'Administrative' }}</td><td class="p-4"><span class="rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold capitalize text-primary">{{ row.status }}</span></td><td class="max-w-xs whitespace-pre-wrap break-words p-4 text-xs text-ink-soft">{{ row.decisionNote || '—' }}</td><td class="p-4"><div v-if="row.canDecide" class="flex gap-3 text-xs"><button class="font-semibold text-primary" @click="open(row, 'approve')">Approve</button><button class="font-semibold text-red-600" @click="open(row, 'reject')">Reject</button></div><span v-else class="text-ink-faint">—</span></td></tr></tbody></table></div><div class="flex justify-between border-t border-line p-4 text-xs"><button :disabled="page <= 1 || loading" @click="page--; load()">Previous</button><span>Page {{ page }}</span><button :disabled="page * 20 >= total || loading" @click="page++; load()">Next</button></div></section>
  </div>
</template>
<style scoped>.field { width:100%; border:1px solid #cbd5e1; border-radius:.6rem; background:transparent; padding:.6rem .75rem; font-size:.875rem; }.secondary { border:1px solid #cbd5e1; border-radius:.6rem; padding:.5rem .75rem; font-size:.8rem; font-weight:600; } button:disabled { opacity:.45; cursor:not-allowed; }</style>
