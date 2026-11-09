<script setup lang="ts">
import { Plus, RefreshCw } from '@lucide/vue'
type Kind = 'vacancy' | 'candidate' | 'onboarding' | 'review'
type RecordRow = { id: string; employeeId: string; employeeName: string; employeeIdentifier: string; title: string; personName: string; email: string; dueDate: string; notes: string; status: string; version: number }
const props = defineProps<{ kind: Kind }>()
const request = useRequestFetch()
const { user } = useBusinessDeskAuth()
const configs = {
  vacancy: { label: 'Job openings', singular: 'opening', title: 'Job title', date: 'Closing date', detail: 'Track open positions. Candidate records are managed separately.' },
  candidate: { label: 'Candidates', singular: 'candidate', title: 'Position', date: 'Follow-up date', detail: 'Move applicants through a simple hiring pipeline.' },
  onboarding: { label: 'Onboarding tasks', singular: 'task', title: 'Task title', date: 'Due date', detail: 'Track individual new-starter tasks against employee records.' },
  review: { label: 'Performance reviews', singular: 'review', title: 'Review title', date: 'Review date', detail: 'Record review notes and complete the review when ready.' },
} as const
const config = computed(() => configs[props.kind])
const rows = ref<RecordRow[]>([]), page = ref(1), total = ref(0), canWrite = ref(false), loading = ref(false), busy = ref(false), error = ref(''), notice = ref('')
const showing = ref(false), editing = ref<RecordRow | null>(null)
const form = reactive({ title: '', personName: '', email: '', employeeId: '', dueDate: '', notes: '' })
const selected = ref<{ row: RecordRow; status: string } | null>(null)
let generation = 0, lifecycle = 0
const message = (e: any) => e?.data?.statusMessage || 'Request failed. Please retry.'
function transitions(status: string): string[] {
  if (props.kind === 'vacancy') return status === 'open' ? ['closed'] : []
  if (props.kind === 'candidate') return ({ applied: ['screening', 'rejected'], screening: ['interview', 'rejected'], interview: ['offer', 'rejected'], offer: ['hired', 'rejected'] } as Record<string, string[]>)[status] || []
  return status === (props.kind === 'review' ? 'draft' : 'open') ? ['completed', 'cancelled'] : []
}
async function load() {
  const current = ++generation, kind = props.kind
  loading.value = true; error.value = ''
  try {
    const result = await request<{ data: RecordRow[]; totalCount: number; canWrite: boolean }>(`/api/hr/work-items/${kind}`, { query: { page: page.value } })
    if (current !== generation) return
    rows.value = result.data; total.value = result.totalCount; canWrite.value = result.canWrite
  } catch (e) { if (current === generation) { rows.value = []; total.value = 0; canWrite.value = false; error.value = message(e) } }
  finally { if (current === generation) loading.value = false }
}
function reset() { Object.assign(form, { title: '', personName: '', email: '', employeeId: '', dueDate: '', notes: '' }); editing.value = null }
function open(row?: RecordRow) {
  reset(); notice.value = ''; error.value = ''; selected.value = null
  if (row) { editing.value = row; Object.assign(form, { title: row.title, personName: row.personName, email: row.email, employeeId: row.employeeId, dueDate: row.dueDate, notes: row.notes }) }
  showing.value = true
}
async function save() {
  if (busy.value) return
  const current = lifecycle, kind = props.kind, row = editing.value
  busy.value = true; error.value = ''; notice.value = ''
  try {
    if (row) await request(`/api/hr/work-items/${kind}/${row.id}` as string, { method: 'PUT', body: { ...form, version: row.version } })
    else await request(`/api/hr/work-items/${kind}` as string, { method: 'POST', body: { ...form } })
    if (current !== lifecycle) return
    showing.value = false; reset(); page.value = 1; await load(); if (current === lifecycle) notice.value = 'Record saved.'
  } catch (e) { if (current === lifecycle) error.value = message(e) } finally { if (current === lifecycle) busy.value = false }
}
async function transition() {
  if (!selected.value || busy.value) return
  const current = lifecycle, kind = props.kind, { row, status } = selected.value
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await request(`/api/hr/work-items/${kind}/${row.id}/transition`, { method: 'POST', body: { status, version: row.version } })
    if (current !== lifecycle) return
    selected.value = null; await load(); if (current === lifecycle) notice.value = 'Status updated.'
  } catch (e) { if (current === lifecycle) error.value = message(e) } finally { if (current === lifecycle) busy.value = false }
}
function clearAndLoad() { ++lifecycle; ++generation; busy.value = false; rows.value = []; total.value = 0; canWrite.value = false; page.value = 1; showing.value = false; selected.value = null; notice.value = ''; error.value = ''; reset(); load() }
watch(() => [props.kind, user.value?.accountId, user.value?.username], clearAndLoad)
onMounted(load)
onBeforeUnmount(() => { ++lifecycle; ++generation })
</script>
<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3"><div><h2 class="text-xl font-semibold">{{ config.label }}</h2><p class="mt-1 text-sm text-ink-soft">{{ config.detail }}</p></div><button v-if="canWrite" class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white" @click="open()"><Plus :size="16" class="mr-1 inline" /> Add {{ config.singular }}</button></div>
    <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p><p v-if="notice" role="status" class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{{ notice }}</p>
    <form v-if="showing" class="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-sm" @submit.prevent="save">
      <div class="flex justify-between"><h3 class="font-semibold capitalize">{{ editing ? 'Edit' : 'New' }} {{ config.singular }}</h3><button type="button" class="text-sm text-ink-soft" @click="showing = false">Close</button></div>
      <div class="grid gap-4 md:grid-cols-2">
        <div><label for="hr-title" class="mb-1 block text-xs font-semibold">{{ config.title }}</label><input id="hr-title" v-model="form.title" required maxlength="150" class="field"></div>
        <div><label for="hr-due" class="mb-1 block text-xs font-semibold">{{ config.date }} <span class="font-normal text-ink-faint">(optional)</span></label><input id="hr-due" v-model="form.dueDate" type="date" min="1900-01-01" max="2999-12-31" class="field"></div>
        <template v-if="kind === 'candidate'"><div><label for="hr-person" class="mb-1 block text-xs font-semibold">Candidate name</label><input id="hr-person" v-model="form.personName" required maxlength="150" class="field"></div><div><label for="hr-email" class="mb-1 block text-xs font-semibold">Email (optional)</label><input id="hr-email" v-model="form.email" type="email" maxlength="150" class="field"></div></template>
        <HrEmployeePicker v-if="kind === 'onboarding' || kind === 'review'" v-model="form.employeeId" :selected-label="editing ? `${editing.employeeName} · ${editing.employeeIdentifier}` : ''" />
      </div>
      <div><label for="hr-notes" class="mb-1 block text-xs font-semibold">Notes (optional)</label><textarea id="hr-notes" v-model="form.notes" maxlength="4000" rows="4" class="field" /></div>
      <button :disabled="busy" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ busy ? 'Saving…' : 'Save record' }}</button>
    </form>
    <div v-if="selected" class="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-sm"><h3 class="font-semibold">Change status to {{ selected.status }}?</h3><p class="text-sm text-ink-soft">{{ selected.row.title }} · This action cannot be undone.</p><div class="flex gap-2"><button :disabled="busy" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" @click="transition">Confirm</button><button class="secondary" @click="selected = null">Go back</button></div></div>
    <section class="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"><div class="flex items-center justify-between border-b border-line p-5"><p class="text-xs text-ink-faint">{{ total }} records</p><button class="secondary" :disabled="loading" @click="load"><RefreshCw :size="14" class="mr-1 inline" /> Refresh</button></div>
      <div v-if="loading" class="p-8 text-center text-sm text-ink-faint">Loading…</div><div v-else-if="!rows.length" class="p-8 text-center text-sm text-ink-faint">{{ error ? 'Records could not be loaded.' : 'No records yet.' }}</div>
      <div v-else class="overflow-x-auto"><table class="w-full min-w-[760px] text-left text-sm"><thead class="bg-canvas text-xs text-ink-faint"><tr><th class="p-4">{{ config.title }}</th><th class="p-4">{{ kind === 'candidate' ? 'Candidate' : kind === 'vacancy' ? 'Details' : 'Employee' }}</th><th class="p-4">{{ config.date }}</th><th class="p-4">Status</th><th class="p-4">Notes</th><th class="p-4">Actions</th></tr></thead><tbody><tr v-for="row in rows" :key="row.id" class="border-t border-line align-top"><td class="p-4 font-semibold">{{ row.title }}</td><td class="p-4">{{ kind === 'candidate' ? row.personName : kind === 'vacancy' ? '—' : row.employeeName }}<div class="mt-1 text-xs text-ink-faint">{{ kind === 'candidate' ? row.email : row.employeeIdentifier }}</div></td><td class="p-4">{{ row.dueDate || '—' }}</td><td class="p-4"><span class="rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold capitalize text-primary">{{ row.status }}</span></td><td class="max-w-xs whitespace-pre-wrap break-words p-4 text-xs text-ink-soft">{{ row.notes || '—' }}</td><td class="p-4"><div v-if="canWrite && transitions(row.status).length" class="flex flex-wrap gap-2 text-xs"><button class="font-semibold text-ink-soft" @click="open(row)">Edit</button><button v-for="next in transitions(row.status)" :key="next" class="font-semibold capitalize text-primary" @click="selected = { row, status: next }; showing = false; error = ''">{{ next }}</button></div><span v-else class="text-ink-faint">—</span></td></tr></tbody></table></div>
      <div class="flex justify-between border-t border-line p-4 text-xs"><button :disabled="page <= 1 || loading" @click="page--; load()">Previous</button><span>Page {{ page }}</span><button :disabled="page * 20 >= total || loading" @click="page++; load()">Next</button></div>
    </section>
  </div>
</template>
<style scoped>
.field { width:100%; border:1px solid #cbd5e1; border-radius:.6rem; background:transparent; padding:.6rem .75rem; font-size:.875rem; }
.secondary { border:1px solid #cbd5e1; border-radius:.6rem; padding:.5rem .75rem; font-size:.8rem; font-weight:600; white-space:nowrap; }
button:disabled { opacity:.45; cursor:not-allowed; }
</style>
