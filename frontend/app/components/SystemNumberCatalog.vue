<script setup lang="ts">
import { Pencil, Plus, Trash2, Search, X } from '@lucide/vue'
const props = withDefaults(defineProps<{ host?: boolean }>(), { host: false })
interface NumberFields { moduleId: number; itemName: string; key: string; prefix: string; suffix: string; formatPattern: string; padding: number; lastNo: number }
interface SystemNumber extends NumberFields { id: string }
const initial = (): NumberFields => ({ moduleId: 0, itemName: '', key: '', prefix: '', suffix: '', formatPattern: '{PREFIX}{NO}{SUFFIX}', padding: 5, lastNo: 0 })
const request = useRequestFetch(), rows = ref<SystemNumber[]>([]), total = ref(0), pages = ref(0), page = ref(1), query = ref(''), loading = ref(true), saving = ref(false), error = ref(''), formError = ref('')
const dialog = ref(false), editingId = ref<string | null>(null), deletion = ref<SystemNumber | null>(null), form = reactive(initial())
const base = computed(() => `/api/${props.host ? 'host' : 'shared'}/system-numbers`)
const strings = [{ key: 'itemName', label: 'Item name', max: 100 }, { key: 'key', label: 'Key', max: 100 }, { key: 'prefix', label: 'Prefix', max: 100 }, { key: 'suffix', label: 'Suffix', max: 100 }, { key: 'formatPattern', label: 'Format pattern', max: 50 }] as const
let version = 0
const message = (e: any) => e?.data?.statusMessage || 'Request failed. Please retry.'
function preview(row: NumberFields) {
  if (!Number.isInteger(row.lastNo) || !Number.isInteger(row.padding) || row.padding < 0 || row.padding > 18) return 'Invalid number settings'
  return row.formatPattern.replace(/\{PREFIX\}|\{SUFFIX\}|\{NO\}/g, token => token === '{PREFIX}' ? row.prefix : token === '{SUFFIX}' ? row.suffix : String(row.lastNo + 1).padStart(row.padding, '0'))
}
async function load() {
  const current = ++version; loading.value = true; error.value = ''
  try {
    const r = await request<{ data: SystemNumber[]; totalCount: number; totalPages: number }>(base.value, { query: { pageNo: page.value, pageSize: 20, query: query.value } })
    if (current !== version) return
    rows.value = r.data; total.value = r.totalCount; pages.value = r.totalPages
    if (page.value > Math.max(1, pages.value)) { page.value = Math.max(1, pages.value); void load() }
  } catch (e) { if (current === version) { error.value = message(e); rows.value = [] } }
  finally { if (current === version) loading.value = false }
}
async function open(id?: string) {
  if (saving.value || (!id && !props.host)) return
  saving.value = true; formError.value = ''; error.value = ''
  try {
    const data = id ? await request<SystemNumber>(`${base.value}/${id}`) : initial()
    Object.assign(form, initial(), Object.fromEntries(Object.keys(initial()).map(k => [k, data[k as keyof NumberFields]])))
    editingId.value = id || null; dialog.value = true
  } catch (e) { error.value = message(e) }
  finally { saving.value = false }
}
async function save() {
  if (saving.value || (!editingId.value && !props.host)) return
  saving.value = true; formError.value = ''
  try {
    await request(`${base.value}${editingId.value ? `/${editingId.value}` : ''}`, { method: editingId.value ? 'PUT' : 'POST', body: { ...form } })
    dialog.value = false; await load()
  } catch (e) { formError.value = message(e) }
  finally { saving.value = false }
}
async function remove() {
  if (!props.host || !deletion.value || saving.value) return
  saving.value = true; formError.value = ''
  try { await request(`${base.value}/${deletion.value.id}`, { method: 'DELETE' }); deletion.value = null; await load() }
  catch (e) { formError.value = message(e) }
  finally { saving.value = false }
}
function changePage(step: number) { page.value += step; void load() }
onMounted(load)
onUnmounted(() => { version++ })
</script>
<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-4"><div><p class="mb-2 text-xs font-medium text-slate-400">{{ host ? 'Host administration' : 'General Ledger' }} / Shared config</p><h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">System numbers</h1><p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{{ host ? 'Manage the numbering templates copied when a new tenant is created.' : 'Edit your company’s numbering settings. Tenant copies cannot be created or deleted.' }}</p></div><button v-if="host" :disabled="saving" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-40" @click="open()"><Plus :size="15" />Add system number</button></header>
    <p class="rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs text-brand-800 dark:border-brand-900 dark:bg-brand-900/20 dark:text-brand-200">{{ host ? 'Host changes affect future tenants only. Existing tenant copies keep their own settings, even if a template is deleted.' : 'These are independent snapshots of host templates at company creation. Host changes do not overwrite your settings.' }}</p>
    <p v-if="error" role="alert" class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{{ error }}</p>
    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800"><form class="flex items-center gap-2" @submit.prevent="page = 1; load()"><input v-model="query" aria-label="Search system numbers" type="search" maxlength="100" placeholder="Search item name or key…" class="h-10 w-64 rounded-lg border border-slate-200 bg-transparent px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700" /><button aria-label="Search" :disabled="loading" class="rounded-lg p-2 text-slate-400"><Search :size="16" /></button></form><button :disabled="saving || loading" class="text-xs font-semibold text-brand-700 disabled:opacity-40 dark:text-brand-300" @click="load">Refresh</button></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[1050px] text-left text-xs"><thead class="bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400 dark:bg-slate-900/50"><tr><th class="px-4 py-3">Module ID</th><th class="px-4 py-3">Item name / Key</th><th class="px-4 py-3">Prefix</th><th class="px-4 py-3">Suffix</th><th class="px-4 py-3">Format pattern</th><th class="px-4 py-3">Padding</th><th class="px-4 py-3">Last number</th><th class="px-4 py-3">Next preview</th><th class="px-4 py-3 text-right">Actions</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800">
        <tr v-if="loading"><td colspan="9" role="status" class="p-10 text-center text-slate-400">Loading system numbers…</td></tr>
        <tr v-for="row in loading ? [] : rows" :key="row.id" class="hover:bg-slate-50/70 dark:hover:bg-slate-900/40"><td class="px-4 py-4 text-slate-500">{{ row.moduleId }}</td><td class="px-4 py-4"><p class="font-semibold text-slate-800 dark:text-slate-200">{{ row.itemName }}</p><p class="mt-1 font-mono text-[10px] text-slate-400">{{ row.key }}</p></td><td class="px-4 py-4">{{ row.prefix || '—' }}</td><td class="px-4 py-4">{{ row.suffix || '—' }}</td><td class="px-4 py-4 font-mono text-slate-500">{{ row.formatPattern }}</td><td class="px-4 py-4">{{ row.padding }}</td><td class="px-4 py-4 tabular-nums">{{ row.lastNo }}</td><td class="px-4 py-4 font-mono text-brand-700 dark:text-brand-300">{{ preview(row) }}</td><td class="whitespace-nowrap px-4 py-4 text-right"><button :disabled="saving" :aria-label="`Edit ${row.itemName}`" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" @click="open(row.id)"><Pencil :size="14" /></button><button v-if="host" :disabled="saving" :aria-label="`Delete ${row.itemName}`" class="rounded-lg p-2 text-slate-400 hover:text-rose-600" @click="formError = ''; deletion = row"><Trash2 :size="14" /></button></td></tr>
        <tr v-if="!loading && !rows.length"><td colspan="9" class="p-10 text-center text-slate-400">{{ error ? 'Unable to load records. Try Refresh.' : host ? 'No system numbers found. Add a template or change your search.' : 'No system number copies found. Only tenants created after templates are configured receive copies.' }}<NuxtLink v-if="!host" to="/host/login" class="ml-2 text-brand-700 underline dark:text-brand-300">Host sign-in</NuxtLink></td></tr>
      </tbody></table></div><footer class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-800"><span>{{ total }} records · Page {{ page }} of {{ Math.max(1, pages) }}</span><div class="flex gap-4"><button :disabled="saving || loading || page <= 1" class="disabled:opacity-40" @click="changePage(-1)">Previous</button><button :disabled="saving || loading || page >= pages" class="disabled:opacity-40" @click="changePage(1)">Next</button></div></footer>
    </section>
    <div v-if="dialog" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="system-number-title" class="max-h-[92vh] w-full max-w-xl overflow-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#172321]"><div class="flex justify-between gap-3"><h2 id="system-number-title" class="text-lg font-semibold">{{ editingId ? 'Edit system number' : 'New system number' }}</h2><button :disabled="saving" aria-label="Close dialog" @click="dialog = false"><X :size="18" /></button></div><form class="mt-5" @submit.prevent="save"><fieldset :disabled="saving" class="space-y-4"><label class="block text-xs font-semibold">Module ID<input v-model.number="form.moduleId" required type="number" min="0" max="2147483647" step="1" class="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700" /></label><label v-for="field in strings" :key="field.key" class="block text-xs font-semibold">{{ field.label }}<input v-model="form[field.key]" :required="field.key !== 'prefix' && field.key !== 'suffix'" :maxlength="field.max" class="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700" /></label><div class="grid grid-cols-2 gap-4"><label class="text-xs font-semibold">Padding<input v-model.number="form.padding" required type="number" min="0" max="18" step="1" class="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700" /></label><label class="text-xs font-semibold">Last number<input v-model.number="form.lastNo" required type="number" min="0" max="2147483647" step="1" class="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700" /></label></div><p class="text-xs text-slate-500">Use {NO} exactly once. Optional tokens: {PREFIX} and {SUFFIX}. Literal separators are supported. Changing the last number can reuse identifiers.</p><p class="rounded-lg bg-brand-50 p-3 text-xs text-brand-800 dark:bg-brand-900/20 dark:text-brand-200">Next preview: <strong class="font-mono">{{ preview(form) }}</strong><span class="mt-1 block">Preview only; no number is allocated or reserved.</span></p><p v-if="formError" role="alert" class="text-xs text-rose-600">{{ formError }}</p><div class="flex justify-end gap-3 pt-2"><button type="button" class="px-3 text-xs text-slate-500" @click="dialog = false">Cancel</button><button class="rounded-lg bg-brand-700 px-4 py-3 text-xs font-semibold text-white">{{ saving ? 'Saving…' : 'Save changes' }}</button></div></fieldset></form></section></div>
    <div v-if="host && deletion" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="system-number-delete" class="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-[#172321]"><h2 id="system-number-delete" class="font-semibold">Delete template?</h2><p class="mt-3 text-sm text-slate-500">Soft-delete {{ deletion.itemName }}? Existing tenant copies remain unchanged; future tenants will not receive this template.</p><p v-if="formError" role="alert" class="mt-3 text-xs text-rose-600">{{ formError }}</p><div class="mt-5 flex justify-end gap-3"><button :disabled="saving" class="px-3 text-xs" @click="deletion = null">Cancel</button><button :disabled="saving" class="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white" @click="remove">{{ saving ? 'Deleting…' : 'Delete template' }}</button></div></section></div>
  </div>
</template>
