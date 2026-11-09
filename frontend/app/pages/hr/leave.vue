<script setup lang="ts">
import { CalendarDays, Plus, RefreshCw } from '@lucide/vue'
definePageMeta({ layout: 'admin-hr' })
useHead({ title: 'Time off · Human Resources' })
type Leave = { id: string; employeeName: string; employeeIdentifier: string; leaveType: string; startDate: string; endDate: string; reason: string; status: string; decisionNote: string; version: number }
type Option = { id: string; employeeIdentifier: string; name: string }
const request = useRequestFetch()
const { user } = useBusinessDeskAuth()
const rows = ref<Leave[]>([]), total = ref(0), page = ref(1), canWrite = ref(false), pending = ref(0)
const loading = ref(false), busy = ref(false), error = ref(''), notice = ref(''), showForm = ref(false)
const options = ref<Option[]>([]), optionSearch = ref(''), optionPage = ref(1), optionTotal = ref(0), optionError = ref('')
const form = reactive({ employeeId: '', leaveType: 'annual', startDate: '', endDate: '', reason: '' })
const decision = ref<Leave | null>(null), action = ref<'approve' | 'reject' | 'cancel'>('approve'), note = ref('')
const message = (e: any) => e?.data?.statusMessage || 'Request failed. Please retry.'
let loadGeneration = 0, optionGeneration = 0, lifecycle = 0
async function load() {
  const generation = ++loadGeneration
  loading.value = true; error.value = ''
  try {
    const result = await request<{ data: Leave[]; totalCount: number; pendingCount: number; canWrite: boolean }>('/api/hr/leave-requests', { query: { page: page.value } })
    if (generation !== loadGeneration) return
    rows.value = result.data; total.value = result.totalCount; pending.value = result.pendingCount; canWrite.value = result.canWrite
  } catch (e) { if (generation === loadGeneration) { rows.value = []; canWrite.value = false; error.value = message(e) } }
  finally { if (generation === loadGeneration) loading.value = false }
}
async function loadOptions() {
  form.employeeId = ''
  const generation = ++optionGeneration
  optionError.value = ''
  try {
    const result = await request<{ data: Option[]; totalCount: number }>('/api/shared/employees/options', { query: { pageNo: optionPage.value, pageSize: 20, query: optionSearch.value } })
    if (generation !== optionGeneration) return
    options.value = result.data; optionTotal.value = result.totalCount
  } catch (e) { if (generation === optionGeneration) { options.value = []; optionError.value = message(e) } }
}
function openForm() { showForm.value = true; notice.value = ''; error.value = ''; optionPage.value = 1; loadOptions() }
async function create() {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  const current = lifecycle
  try {
    await request('/api/hr/leave-requests', { method: 'POST', body: { ...form } })
    if (current !== lifecycle) return
    Object.assign(form, { employeeId: '', leaveType: 'annual', startDate: '', endDate: '', reason: '' })
    showForm.value = false; page.value = 1; await load(); if (current === lifecycle) notice.value = 'Leave request created.'
  } catch (e) { if (current === lifecycle) error.value = message(e) } finally { if (current === lifecycle) busy.value = false }
}
function openDecision(row: Leave, next: 'approve' | 'reject' | 'cancel') { decision.value = row; action.value = next; note.value = ''; error.value = ''; notice.value = '' }
async function submitDecision() {
  if (!decision.value || busy.value) return
  busy.value = true; error.value = ''
  const current = lifecycle
  try {
    await request(`/api/hr/leave-requests/${decision.value.id}/${action.value}`, { method: 'POST', body: { version: decision.value.version, note: note.value } })
    if (current !== lifecycle) return
    decision.value = null; await load(); if (current === lifecycle) notice.value = 'Request updated.'
  } catch (e) { if (current === lifecycle) error.value = message(e) } finally { if (current === lifecycle) busy.value = false }
}
watch(() => `${user.value?.accountId}:${user.value?.username}`, () => {
  ++lifecycle; ++loadGeneration; ++optionGeneration; busy.value = false; rows.value = []; options.value = []; total.value = 0; pending.value = 0; canWrite.value = false; showForm.value = false; decision.value = null; page.value = 1; notice.value = ''; error.value = ''; Object.assign(form, { employeeId: '', leaveType: 'annual', startDate: '', endDate: '', reason: '' }); load()
})
onMounted(load)
</script>
<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-4"><div><p class="text-xs font-bold uppercase tracking-[.16em] text-primary">People / Time off</p><h1 class="mt-2 text-3xl font-semibold tracking-tight">Time off</h1><p class="mt-2 text-sm text-ink-soft">Record and review requests in one place.</p></div><button v-if="canWrite" class="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white" @click="openForm"><Plus :size="16" class="mr-1 inline" /> New request</button></header>
    <div class="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">Dates are inclusive. Working days, holidays and overlapping requests are not enforced; review them before approving. <a href="/hr/balances" class="font-semibold underline">View the calendar-day leave estimate</a>.</div>
    <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p><p v-if="notice" role="status" class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{{ notice }}</p>
    <form v-if="showForm" class="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-sm" @submit.prevent="create">
      <div class="flex justify-between gap-3"><div><h2 class="text-lg font-semibold">New leave request</h2><p class="mt-1 text-xs text-ink-faint">Select an employee, then enter the requested dates.</p></div><button type="button" class="text-sm text-ink-soft" @click="showForm = false">Close</button></div>
      <div class="grid gap-4 md:grid-cols-2"><div><label for="employee-search" class="mb-1 block text-xs font-semibold">Find employee</label><div class="flex gap-2"><input id="employee-search" v-model="optionSearch" class="field" placeholder="Name, ID or department" @keyup.enter.prevent="optionPage = 1; loadOptions()"><button type="button" class="secondary" @click="optionPage = 1; loadOptions()">Search</button></div><p v-if="optionError" class="mt-1 text-xs text-red-600">{{ optionError }}</p></div>
      <div><label for="employee" class="mb-1 block text-xs font-semibold">Employee</label><select id="employee" v-model="form.employeeId" required class="field"><option value="">Select an employee</option><option v-for="item in options" :key="item.id" :value="item.id">{{ item.name }} · {{ item.employeeIdentifier }}</option></select><div class="mt-1 flex gap-3 text-xs text-ink-faint"><button type="button" :disabled="optionPage <= 1" @click="optionPage--; loadOptions()">Previous</button><span>Page {{ optionPage }} · {{ optionTotal }} found</span><button type="button" :disabled="optionPage * 20 >= optionTotal" @click="optionPage++; loadOptions()">Next</button></div></div>
      <div><label for="type" class="mb-1 block text-xs font-semibold">Leave type</label><select id="type" v-model="form.leaveType" class="field"><option value="annual">Annual</option><option value="sick">Sick</option><option value="unpaid">Unpaid</option><option value="other">Other</option></select></div><div></div>
      <div><label for="start" class="mb-1 block text-xs font-semibold">Start date</label><input id="start" v-model="form.startDate" type="date" min="1900-01-01" max="2999-12-31" required class="field"></div><div><label for="end" class="mb-1 block text-xs font-semibold">End date</label><input id="end" v-model="form.endDate" type="date" :min="form.startDate || '1900-01-01'" max="2999-12-31" required class="field"></div></div>
      <div><label for="reason" class="mb-1 block text-xs font-semibold">Reason <span class="font-normal text-ink-faint">(optional)</span></label><textarea id="reason" v-model="form.reason" maxlength="500" rows="2" class="field" /></div><button :disabled="busy" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ busy ? 'Saving…' : 'Create request' }}</button>
    </form>
    <form v-if="decision" class="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-sm" @submit.prevent="submitDecision"><h2 class="font-semibold capitalize">{{ action }} request for {{ decision.employeeName }}?</h2><p class="text-sm text-ink-soft">{{ decision.startDate }} to {{ decision.endDate }} · This decision is final.</p><label for="note" class="block text-xs font-semibold">Decision note (optional)</label><textarea id="note" v-model="note" maxlength="500" rows="2" class="field" /><div class="flex gap-2"><button :disabled="busy" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirm {{ action }}</button><button type="button" class="secondary" @click="decision = null">Go back</button></div></form>
    <section class="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"><div class="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5"><div><h2 class="font-semibold">Requests</h2><p class="mt-1 text-xs text-ink-faint">{{ total }} total · {{ pending }} pending</p></div><button class="secondary" :disabled="loading" @click="load"><RefreshCw :size="14" class="mr-1 inline" /> Refresh</button></div>
      <div v-if="loading" class="p-8 text-center text-sm text-ink-faint">Loading requests…</div><div v-else-if="!rows.length" class="p-10 text-center text-sm text-ink-faint"><CalendarDays :size="24" class="mx-auto mb-3" />{{ error ? 'Requests could not be loaded.' : 'No requests yet.' }}</div>
      <div v-else class="overflow-x-auto"><table class="w-full min-w-[800px] text-left text-sm"><thead class="bg-canvas text-xs text-ink-faint"><tr><th class="p-4">Employee</th><th class="p-4">Type</th><th class="p-4">Dates</th><th class="p-4">Status</th><th class="p-4">Details</th><th class="p-4">Actions</th></tr></thead><tbody><tr v-for="row in rows" :key="row.id" class="border-t border-line align-top"><td class="p-4"><strong>{{ row.employeeName }}</strong><div class="mt-1 text-xs text-ink-faint">{{ row.employeeIdentifier }}</div></td><td class="p-4 capitalize">{{ row.leaveType }}</td><td class="p-4">{{ row.startDate }}<br><span class="text-ink-faint">to {{ row.endDate }}</span></td><td class="p-4"><span class="rounded-full px-2 py-1 text-xs font-semibold capitalize" :class="row.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : row.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'">{{ row.status }}</span></td><td class="max-w-xs whitespace-pre-wrap break-words p-4 text-xs text-ink-soft"><span v-if="row.reason">{{ row.reason }}</span><span v-if="row.decisionNote" class="block mt-1">Decision: {{ row.decisionNote }}</span><span v-if="!row.reason && !row.decisionNote">—</span></td><td class="p-4"><div v-if="canWrite && row.status === 'pending'" class="flex flex-wrap gap-2 text-xs"><button class="font-semibold text-primary" @click="openDecision(row, 'approve')">Approve</button><button class="font-semibold text-red-600" @click="openDecision(row, 'reject')">Reject</button><button class="font-semibold text-ink-soft" @click="openDecision(row, 'cancel')">Cancel</button></div><span v-else class="text-ink-faint">—</span></td></tr></tbody></table></div>
      <div class="flex justify-between border-t border-line p-4 text-xs"><button :disabled="page <= 1 || loading" @click="page--; load()">Previous</button><span>Page {{ page }}</span><button :disabled="page * 20 >= total || loading" @click="page++; load()">Next</button></div>
    </section>
  </div>
</template>
<style scoped>
.field { width: 100%; border: 1px solid #cbd5e1; border-radius: .6rem; background: transparent; padding: .6rem .75rem; font-size: .875rem; }
.secondary { border: 1px solid #cbd5e1; border-radius: .6rem; padding: .5rem .75rem; font-size: .8rem; font-weight: 600; white-space: nowrap; }
button:disabled { opacity: .45; cursor: not-allowed; }
</style>
