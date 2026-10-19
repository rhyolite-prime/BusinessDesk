<script setup lang="ts">
import { Pencil, Plus, Trash2, Landmark, X } from '@lucide/vue'
definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Banks and branches' })
interface BankRow { id: string; name: string; bankCode?: string; bankId?: string; contactPerson: string; contactNo: string; email: string }
interface TableState { rows: BankRow[]; page: number; pages: number; total: number; query: string; loading: boolean; error: string }
const tables = reactive<TableState[]>([0, 1].map(() => ({ rows: [], page: 1, pages: 0, total: 0, query: '', loading: false, error: '' })))
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
      // Selection remains independent of header pagination/search, but revalidate it on refresh.
      const row = await request<BankRow>(`${endpoint(0)}/${selectedId}`)
      if (versions[level] === version && selected.value?.id === row.id) selected.value = row
    }
  } catch (e: any) {
    if (versions[level] === version) {
      table.error = message(e)
      if (!level && e?.statusCode === 404 && selected.value?.id === selectedId) { selected.value = null; versions[1]!++; tables[1]!.rows = []; tables[1]!.loading = false }
    }
  } finally { if (versions[level] === version) table.loading = false }
}
function choose(row: BankRow) {
  if (saving.value) return
  selected.value = row; tables[1]!.page = 1; tables[1]!.query = ''; tables[1]!.rows = []; void load(1)
}
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
    if (!d.level) { selected.value = row; tables[1]!.page = 1; tables[1]!.query = ''; await load(1) }
    await load(d.level)
  } catch (e) { formError.value = message(e) }
  finally { saving.value = false }
}
async function remove() {
  if (!deletion.value || saving.value) return
  const d = deletion.value; saving.value = true; formError.value = ''
  try {
    await request(`${endpoint(d.level, d.bankId)}/${d.row.id}`, { method: 'DELETE' })
    if (!d.level && selected.value?.id === d.row.id) { selected.value = null; versions[1]!++; tables[1]!.rows = []; tables[1]!.total = 0; tables[1]!.pages = 0; tables[1]!.loading = false }
    deletion.value = null; await load(d.level)
  } catch (e) { formError.value = message(e) }
  finally { saving.value = false }
}
onMounted(() => load(0))
onUnmounted(() => { versions[0]!++; versions[1]!++ })
</script>
<template>
  <div class="space-y-6 p-4 sm:p-6 lg:p-8">
    <header class="flex items-start gap-3"><div class="rounded-xl bg-brand-50 p-3 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"><Landmark :size="22" /></div><div><p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Shared config</p><h1 class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Banks and branches</h1><p class="mt-1 text-xs text-slate-500">Manage your company’s bank headers and their branch records. Select a bank to see its branches.</p></div></header>
    <section v-for="(table, level) in tables" :key="level" class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800"><div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">{{ level ? 'Branches' : 'Banks' }} <span class="ml-2 text-xs font-normal text-slate-400">{{ level ? selected?.name || 'Select a bank above' : 'Header table' }}</span></h2><p class="mt-1 text-[11px] text-slate-400">{{ level ? 'Child table · Each branch belongs to the selected bank' : 'Tenant-owned directory · Click a bank name to select it' }}</p></div><button :disabled="saving || !!dialog || !!deletion || (level === 1 && !selected)" class="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white disabled:opacity-40" @click="open(level)"><Plus :size="14" />Add {{ level ? 'branch' : 'bank' }}</button></div>
      <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><form class="flex gap-2" @submit.prevent="search(level)"><input v-model="table.query" :disabled="level === 1 && !selected" :aria-label="level ? 'Search branches' : 'Search banks'" maxlength="160" type="search" :placeholder="level ? 'Search branch name…' : 'Search bank name or code…'" class="h-9 w-56 rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700" /><button :disabled="table.loading || (level === 1 && !selected)" class="text-xs font-semibold text-brand-700 dark:text-brand-300">Search</button></form><button :disabled="saving || table.loading || (level === 1 && !selected)" class="text-xs text-slate-500 underline" @click="load(level)">Refresh</button></div>
      <p v-if="table.error" role="alert" class="mx-5 mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{{ table.error }}</p>
      <div class="overflow-x-auto"><table class="w-full min-w-[850px] text-left text-xs"><thead class="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 dark:bg-slate-900/50"><tr><th class="px-5 py-3">{{ level ? 'Branch name' : 'Bank name' }}</th><th v-if="!level" class="px-4 py-3">Bank code</th><th class="px-4 py-3">Contact person</th><th class="px-4 py-3">Contact number</th><th class="px-4 py-3">Email</th><th class="px-4 py-3 text-right">Actions</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800">
        <tr v-if="table.loading"><td :colspan="level ? 5 : 6" role="status" class="p-10 text-center text-slate-400">Loading {{ level ? 'branches' : 'banks' }}…</td></tr>
        <tr v-for="row in table.loading ? [] : table.rows" :key="row.id" :class="!level && selected?.id === row.id ? 'bg-brand-50/70 dark:bg-brand-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'"><td class="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200"><button v-if="!level" :disabled="saving || !!dialog || !!deletion" :aria-pressed="selected?.id === row.id" class="text-left underline decoration-dotted underline-offset-4" @click="choose(row)">{{ row.name }}<span v-if="selected?.id === row.id" class="ml-2 text-[10px] text-brand-600">Selected</span></button><span v-else>{{ row.name }}</span></td><td v-if="!level" class="px-4 py-4 font-mono text-brand-700 dark:text-brand-300">{{ row.bankCode }}</td><td class="px-4 py-4 text-slate-500">{{ row.contactPerson || '—' }}</td><td class="px-4 py-4 text-slate-500">{{ row.contactNo || '—' }}</td><td class="px-4 py-4 text-slate-500">{{ row.email || '—' }}</td><td class="px-4 py-4 text-right"><button :disabled="saving || !!dialog || !!deletion" :aria-label="`Edit ${level ? 'branch' : 'bank'} ${row.name}`" class="rounded-md p-2 text-slate-400 hover:text-brand-700" @click="open(level, row)"><Pencil :size="14" /></button><button :disabled="saving || !!dialog || !!deletion" :aria-label="`Delete ${level ? 'branch' : 'bank'} ${row.name}`" class="rounded-md p-2 text-slate-400 hover:text-rose-600" @click="formError = ''; deletion = { level, row, bankId: selected?.id }"><Trash2 :size="14" /></button></td></tr>
        <tr v-if="!table.loading && !table.rows.length"><td :colspan="level ? 5 : 6" class="p-10 text-center text-slate-400">{{ level && !selected ? 'Select a bank in the header table to manage its branches.' : table.error ? 'Unable to load records. Try Refresh.' : `No ${level ? 'branches' : 'banks'} found. Add one or try a different search.` }}</td></tr>
      </tbody></table></div>
      <footer class="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400 dark:border-slate-800"><span>{{ table.total }} records · Page {{ table.page }} of {{ Math.max(1, table.pages) }}</span><div class="flex gap-4"><button :disabled="saving || table.loading || table.page <= 1" @click="paginate(level, -1)">Previous</button><button :disabled="saving || table.loading || table.page >= table.pages" @click="paginate(level, 1)">Next</button></div></footer>
    </section>
    <div v-if="dialog" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="bank-form-title" class="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-[#172321]"><div class="flex items-start justify-between"><div><h2 id="bank-form-title" class="text-lg font-semibold text-slate-900 dark:text-white">{{ dialog.id ? 'Edit' : 'New' }} {{ dialog.level ? 'branch' : 'bank' }}</h2><p class="mt-1 text-xs text-slate-500">{{ dialog.level ? `Bank: ${selected?.name}` : 'Bank header details for your company' }}</p></div><button :disabled="saving" aria-label="Close dialog" @click="dialog = null"><X :size="18" /></button></div><form class="mt-5" @submit.prevent="save"><fieldset :disabled="saving" class="space-y-4"><template v-for="field in fields" :key="field.key"><label v-if="!dialog.level || field.key !== 'bankCode'" class="block"><span class="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{{ field.label }}{{ field.key === 'name' || field.key === 'bankCode' ? ' *' : '' }}</span><input v-model="form[field.key]" :required="field.key === 'name' || field.key === 'bankCode'" :maxlength="field.max" :type="field.key === 'email' ? 'email' : field.key === 'contactNo' ? 'tel' : 'text'" class="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" /></label></template><p v-if="formError" role="alert" class="text-xs text-rose-600">{{ formError }}</p><div class="flex justify-end gap-3 pt-3"><button type="button" class="px-3 text-xs text-slate-500" @click="dialog = null">Cancel</button><button class="rounded-lg bg-brand-700 px-4 py-3 text-xs font-semibold text-white">{{ saving ? 'Saving…' : 'Save changes' }}</button></div></fieldset></form></section></div>
    <div v-if="deletion" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="bank-delete-title" class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#172321]"><h2 id="bank-delete-title" class="font-semibold text-slate-900 dark:text-white">Delete {{ deletion.level ? 'branch' : 'bank' }}?</h2><p class="mt-3 text-sm text-slate-500">Delete {{ deletion.row.name }}? {{ deletion.level ? 'The branch will be soft-deleted.' : 'This bank and all of its branches will be soft-deleted together.' }}</p><p v-if="formError" role="alert" class="mt-3 text-xs text-rose-600">{{ formError }}</p><div class="mt-5 flex justify-end gap-3"><button :disabled="saving" class="px-3 text-xs text-slate-500" @click="deletion = null">Cancel</button><button :disabled="saving" class="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white" @click="remove">{{ saving ? 'Deleting…' : 'Delete' }}</button></div></section></div>
  </div>
</template>
