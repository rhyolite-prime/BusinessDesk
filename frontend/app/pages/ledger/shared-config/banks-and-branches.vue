<script setup lang="ts">
import { Maximize, Minimize, X } from '@lucide/vue'
definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Banks and branches' })
interface BankRow { id: string; name: string; bankCode?: string; bankId?: string; contactPerson: string; contactNo: string; email: string }
interface TableState { rows: BankRow[]; page: number; pages: number; total: number; query: string; loading: boolean; error: string }
const tables = reactive<TableState[]>([0, 1].map(() => ({ rows: [], page: 1, pages: 0, total: 0, query: '', loading: false, error: '' })))
const selectedBranch = ref<BankRow | null>(null), fullscreen = ref(false)
const selected = ref<BankRow | null>(null), request = useRequestFetch(), saving = ref(false)
const dialog = ref<{ level: number; id?: string; bankId?: string } | null>(null)
const deletion = ref<{ level: number; row: BankRow; bankId?: string } | null>(null)
const form = reactive({ name: '', bankCode: '', contactPerson: '', contactNo: '', email: '' }), formError = ref('')
const versions = [0, 0]
const fields = [{ key: 'name', label: 'Name', max: 160 }, { key: 'bankCode', label: 'Bank code', max: 40 }, { key: 'contactPerson', label: 'Contact person', max: 160 }, { key: 'contactNo', label: 'Contact number', max: 50 }, { key: 'email', label: 'Email', max: 254 }] as const
const message = (e: any) => e?.data?.statusMessage || 'Request failed. Please retry.'
const endpoint = (level: number, bankId = selected.value?.id) => level ? `/api/shared/banks/${bankId}/branches` : '/api/shared/banks'
async function load(level: number) {
  const table = tables[level]!, version = ++versions[level]!, selectedId = selected.value?.id
  if (level && !selected.value) { table.rows = []; table.total = 0; table.pages = 0; return }
  table.loading = true; table.error = ''
  try {
    const r = await request<{ data: BankRow[]; totalPages: number; totalCount: number }>(endpoint(level), { query: { pageNo: table.page, pageSize: 20, query: table.query } })
    if (versions[level] !== version) return
    table.rows = r.data; table.pages = r.totalPages; table.total = r.totalCount
    if (table.page > Math.max(1, table.pages)) { table.page = Math.max(1, table.pages); void load(level) }
    if (!level && selected.value) {
      const row = table.rows.find(row => row.id === selected.value?.id)
      if (row) selected.value = row
      else collapse()
    } else if (level && selectedBranch.value) {
      selectedBranch.value = table.rows.find(row => row.id === selectedBranch.value?.id) || null
    }
  } catch (e: any) {
    if (versions[level] === version) {
      table.error = message(e)
      if (!level && e?.statusCode === 404 && selected.value?.id === selectedId) { selected.value = null; versions[1]!++; tables[1]!.rows = []; tables[1]!.loading = false }
    }
  } finally { if (versions[level] === version) table.loading = false }
}
function collapse() {
  selected.value = null; selectedBranch.value = null; versions[1]!++
  Object.assign(tables[1]!, { rows: [], page: 1, pages: 0, total: 0, error: '', loading: false })
}
function toggle(row: BankRow) { if (selected.value?.id === row.id) collapse(); else choose(row) }
function choose(row: BankRow) {
  if (saving.value) return
  selected.value = row; selectedBranch.value = null; tables[1]!.page = 1; tables[1]!.query = ''; tables[1]!.rows = []; void load(1)
}
function confirmDelete(level: number, row: BankRow) { formError.value = ''; deletion.value = { level, row, bankId: selected.value?.id } }
function search(level: number) { tables[level]!.page = 1; void load(level) }
function paginate(level: number, step: number) { tables[level]!.page += step; void load(level) }
async function open(level: number, row?: BankRow) {
  if (saving.value || (level && !selected.value)) return
  saving.value = true; formError.value = ''; tables[level]!.error = ''
  const bankId = selected.value?.id
  try {
    const data = row ? await request<BankRow>(`${endpoint(level, bankId)}/${row.id}`) : null
    Object.assign(form, { name: '', bankCode: '', contactPerson: '', contactNo: '', email: '' }, data ? { name: data.name, bankCode: data.bankCode || '', contactPerson: data.contactPerson, contactNo: data.contactNo, email: data.email } : {})
    dialog.value = { level, id: row?.id, bankId }
  } catch (e) { tables[level]!.error = message(e) }
  finally { saving.value = false }
}
async function save() {
  if (!dialog.value || saving.value) return
  const d = dialog.value; saving.value = true; formError.value = ''
  const body: Record<string, string> = { name: form.name.trim(), contactPerson: form.contactPerson.trim(), contactNo: form.contactNo.trim(), email: form.email.trim() }
  if (!d.level) body.bankCode = form.bankCode.trim()
  try {
    const row = await request<BankRow>(`${endpoint(d.level, d.bankId)}${d.id ? `/${d.id}` : ''}`, { method: d.id ? 'PUT' : 'POST', body })
    dialog.value = null
    if (!d.level) { selected.value = row; selectedBranch.value = null; tables[1]!.page = 1; tables[1]!.query = ''; await load(1) }
    await load(d.level)
  } catch (e) { formError.value = message(e) }
  finally { saving.value = false }
}
async function remove() {
  if (!deletion.value || saving.value) return
  const d = deletion.value; saving.value = true; formError.value = ''
  try {
    await request(`${endpoint(d.level, d.bankId)}/${d.row.id}`, { method: 'DELETE' })
    if (!d.level && selected.value?.id === d.row.id) collapse()
    deletion.value = null; await load(d.level)
  } catch (e) { formError.value = message(e) }
  finally { saving.value = false }
}
onMounted(() => load(0))
onUnmounted(() => { versions[0]!++; versions[1]!++ })
</script>
<template>
  <div class="space-y-6" :class="fullscreen ? 'fixed inset-0 z-[60] overflow-auto bg-slate-50 p-4 sm:p-8 dark:bg-[#0d1715]' : ''">
    <header class="flex flex-wrap items-start justify-between gap-4"><div><div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Shared config</div><h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Banks &amp; Branches</h1><p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Manage your company’s banks, branch locations and contact details in one place.</p></div><div class="flex items-center gap-2"><button class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:text-white" :aria-label="fullscreen ? 'Exit expanded view' : 'Expand view'" :title="fullscreen ? 'Exit expanded view' : 'Expand view'" @click="fullscreen = !fullscreen"><Minimize v-if="fullscreen" :size="16" /><Maximize v-else :size="16" /></button><NuxtLink to="/ledger" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:text-white" aria-label="Close banks and branches" title="Close"><X :size="16" /></NuxtLink></div></header>
    <BankDirectoryGrid :table="tables[0]!" :selected="selected" :busy="saving || !!dialog || !!deletion" @create="open(0)" @edit="open(0, $event)" @remove="confirmDelete(0, $event)" @select="choose" @toggle="toggle" @query="tables[0]!.query = $event" @search="search(0)" @refresh="load(0)" @paginate="paginate(0, $event)">
      <template #branches>
        <BankDirectoryGrid :table="tables[1]!" :selected="selectedBranch" branch :busy="saving || !!dialog || !!deletion" @create="open(1)" @edit="open(1, $event)" @remove="confirmDelete(1, $event)" @select="selectedBranch = $event" @query="tables[1]!.query = $event" @search="search(1)" @refresh="load(1)" @paginate="paginate(1, $event)" />
      </template>
    </BankDirectoryGrid>
    <div v-if="dialog" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="bank-form-title" class="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-[#172321]"><div class="flex items-start justify-between"><div><h2 id="bank-form-title" class="text-lg font-semibold text-slate-900 dark:text-white">{{ dialog.id ? 'Edit' : 'New' }} {{ dialog.level ? 'branch' : 'bank' }}</h2><p class="mt-1 text-xs text-slate-500">{{ dialog.level ? `Bank: ${selected?.name}` : 'Bank header details for your company' }}</p></div><button :disabled="saving" aria-label="Close dialog" @click="dialog = null"><X :size="18" /></button></div><form class="mt-5" @submit.prevent="save"><fieldset :disabled="saving" class="space-y-4"><template v-for="field in fields" :key="field.key"><label v-if="!dialog.level || field.key !== 'bankCode'" class="block"><span class="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{{ field.label }}{{ field.key === 'name' || field.key === 'bankCode' ? ' *' : '' }}</span><input v-model="form[field.key]" :required="field.key === 'name' || field.key === 'bankCode'" :maxlength="field.max" :type="field.key === 'email' ? 'email' : field.key === 'contactNo' ? 'tel' : 'text'" class="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" /></label></template><p v-if="formError" role="alert" class="text-xs text-rose-600">{{ formError }}</p><div class="flex justify-end gap-3 pt-3"><button type="button" class="px-3 text-xs text-slate-500" @click="dialog = null">Cancel</button><button class="rounded-lg bg-brand-700 px-4 py-3 text-xs font-semibold text-white">{{ saving ? 'Saving…' : 'Save changes' }}</button></div></fieldset></form></section></div>
    <div v-if="deletion" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="bank-delete-title" class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#172321]"><h2 id="bank-delete-title" class="font-semibold text-slate-900 dark:text-white">Delete {{ deletion.level ? 'branch' : 'bank' }}?</h2><p class="mt-3 text-sm text-slate-500">Delete {{ deletion.row.name }}? {{ deletion.level ? 'The branch will be soft-deleted.' : 'This bank and all of its branches will be soft-deleted together.' }}</p><p v-if="formError" role="alert" class="mt-3 text-xs text-rose-600">{{ formError }}</p><div class="mt-5 flex justify-end gap-3"><button :disabled="saving" class="px-3 text-xs text-slate-500" @click="deletion = null">Cancel</button><button :disabled="saving" class="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white" @click="remove">{{ saving ? 'Deleting…' : 'Delete' }}</button></div></section></div>
  </div>
</template>
