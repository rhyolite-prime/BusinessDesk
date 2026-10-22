<script setup lang="ts">
import { Check, Pencil, Plus, Search, Trash2, X } from '@lucide/vue'
const props = withDefaults(defineProps<{ host?: boolean }>(), { host: false })
interface Currency { id: string; code: string; name: string; decimalPlaces: number; isActive: boolean }
const request = useRequestFetch(), rows = ref<Currency[]>([]), total = ref(0), totalPages = ref(0), page = ref(1), search = ref(''), query = ref('')
const loading = ref(true), saving = ref(false), error = ref(''), saveError = ref(''), deleteError = ref('')
const showForm = ref(false), editingId = ref<string | null>(null), deleteTarget = ref<Currency | null>(null)
const form = reactive({ code: '', name: '', decimalPlaces: 2, isActive: true })
const base = computed(() => props.host ? '/api/host/currencies' : '/api/shared/currencies')
let version = 0, timer: ReturnType<typeof setTimeout> | undefined
const message = (e: any) => e?.data?.statusMessage || e?.message || 'Request failed. Please retry.'
async function load() {
  const current = ++version; loading.value = true; error.value = ''
  try {
    const result = await request<{ data: Currency[]; totalCount: number; totalPages: number }>(base.value, { query: { pageNo: page.value, pageSize: 20, query: query.value } })
    if (current !== version) return
    rows.value = result.data; total.value = result.totalCount; totalPages.value = result.totalPages
    if (page.value > Math.max(1, totalPages.value)) page.value = Math.max(1, totalPages.value)
  } catch (e) { if (current === version) { rows.value = []; error.value = message(e) } }
  finally { if (current === version) loading.value = false }
}
watch(search, value => { clearTimeout(timer); timer = setTimeout(() => { query.value = value.trim(); page.value = 1 }, 300) })
watch([page, query], () => { void load() })
onMounted(load)
onUnmounted(() => { clearTimeout(timer); version++ })
function create() { editingId.value = null; saveError.value = ''; Object.assign(form, { code: '', name: '', decimalPlaces: 2, isActive: true }); showForm.value = true }
async function edit(id: string) {
  if (saving.value || !props.host) return
  saving.value = true; error.value = ''; saveError.value = ''
  try {
    const row = await request<Currency>(`${base.value}/${id}`)
    editingId.value = row.id; Object.assign(form, { code: row.code, name: row.name, decimalPlaces: row.decimalPlaces, isActive: row.isActive }); showForm.value = true
  } catch (e) { error.value = message(e) }
  finally { saving.value = false }
}
async function save() {
  if (saving.value || !props.host) return
  saving.value = true; saveError.value = ''
  try {
    const body = { ...form, code: form.code.trim().toUpperCase(), name: form.name.trim() }
    if (editingId.value) await request(`${base.value}/${editingId.value}`, { method: 'PUT', body })
    else await request(base.value, { method: 'POST', body })
    showForm.value = false; await load()
  } catch (e) { saveError.value = message(e) }
  finally { saving.value = false }
}
async function remove() {
  if (saving.value || !props.host || !deleteTarget.value) return
  saving.value = true; deleteError.value = ''
  try { await request(`${base.value}/${deleteTarget.value.id}`, { method: 'DELETE' }); deleteTarget.value = null; await load() }
  catch (e) { deleteError.value = message(e) }
  finally { saving.value = false }
}
</script>
<template>
  <div class="space-y-6">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><div class="mb-2 text-xs font-medium text-slate-400">Shared config</div><h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Currencies</h1><p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Shared currency codes, decimal precision and activation status for all companies.</p></div>
      <button v-if="host" :disabled="saving || loading" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800 disabled:opacity-50" @click="create"><Plus :size="15" /> Add currency</button>
    </section>
    <p v-if="!host" class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">This catalog is shared across all companies and is read-only for tenants. <NuxtLink to="/host/login" class="font-semibold text-brand-700 underline dark:text-brand-300">Manage as a host administrator</NuxtLink>.</p>
    <p v-if="error" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ error }}</p>
    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800">
        <div class="relative w-full sm:max-w-[360px]"><Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="search" aria-label="Search currencies" type="search" placeholder="Search currency code or name…" class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" /></div>
        <div class="flex items-center gap-3"><button :disabled="saving || loading" class="text-xs font-semibold text-brand-700 underline dark:text-brand-300 disabled:opacity-40" @click="load">Refresh</button><span class="rounded-md bg-slate-50 px-2.5 py-2 text-[10px] text-slate-400 dark:bg-slate-800">{{ total }} currencies</span></div>
      </div>
      <div class="overflow-x-auto"><table class="w-full min-w-[600px] text-left"><thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="px-5 py-3">Code</th><th class="px-4 py-3">Currency name</th><th class="px-4 py-3">Decimal places</th><th class="px-4 py-3">Status</th><th v-if="host" class="w-24 px-4 py-3 text-right">Actions</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800">
        <tr v-if="loading"><td :colspan="host ? 5 : 4" role="status" class="px-5 py-10 text-center text-xs text-slate-400">Loading currencies…</td></tr>
        <tr v-for="currency in loading ? [] : rows" :key="currency.id" class="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40"><td class="px-5 py-3.5 font-mono text-xs font-semibold text-brand-700 dark:text-brand-300">{{ currency.code }}</td><td class="px-4 py-3.5 text-xs font-semibold text-slate-800 dark:text-slate-200">{{ currency.name }}</td><td class="px-4 py-3.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">{{ currency.decimalPlaces }}</td><td class="px-4 py-3.5"><span class="inline-flex items-center gap-1.5 text-[10px] font-medium" :class="currency.isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'"><span class="h-1.5 w-1.5 rounded-full" :class="currency.isActive ? 'bg-emerald-500' : 'bg-slate-300'" />{{ currency.isActive ? 'Active' : 'Inactive' }}</span></td><td v-if="host" class="px-4 py-3.5 text-right"><button :disabled="saving" class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Edit currency" @click="edit(currency.id)"><Pencil :size="14" /></button><button :disabled="saving" class="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" aria-label="Delete currency" @click="deleteError = ''; deleteTarget = currency"><Trash2 :size="14" /></button></td></tr>
        <tr v-if="!loading && !error && !rows.length"><td :colspan="host ? 5 : 4" class="px-5 py-12 text-center"><p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No currencies found</p><p class="mt-1 text-xs text-slate-400">{{ host ? 'Try another search or add a currency.' : 'Try another search or ask a host administrator to configure currencies.' }}</p></td></tr>
      </tbody></table></div>
      <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-800"><span>Page {{ page }} of {{ Math.max(1, totalPages) }} · Shared catalog</span><div class="flex gap-3"><button :disabled="loading || saving || page <= 1" class="disabled:opacity-40" @click="page--">Previous</button><button :disabled="loading || saving || page >= totalPages" class="disabled:opacity-40" @click="page++">Next</button></div></footer>
    </section>
    <div v-if="host && showForm" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" @click.self="!saving && (showForm = false)"><section role="dialog" aria-modal="true" aria-labelledby="currency-form-title" class="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
      <div class="flex items-start justify-between"><div><h2 id="currency-form-title" class="text-lg font-semibold text-slate-900 dark:text-white">{{ editingId ? 'Edit currency' : 'New currency' }}</h2><p class="mt-1 text-xs text-slate-500">Changes apply to the shared catalog for all companies.</p></div><button :disabled="saving" aria-label="Close dialog" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" @click="showForm = false"><X :size="17" /></button></div>
      <form class="mt-5" @submit.prevent="save"><fieldset :disabled="saving" class="space-y-4"><label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Currency code</span><input v-model="form.code" required minlength="3" maxlength="3" pattern="[A-Za-z]{3}" placeholder="GHS" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm uppercase outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /></label><label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Currency name</span><input v-model="form.name" required maxlength="100" placeholder="Ghana cedi" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /></label><label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Decimal places</span><select v-model.number="form.decimalPlaces" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option v-for="n in 7" :key="n" :value="n - 1">{{ n - 1 }}</option></select></label><label class="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"><input v-model="form.isActive" type="checkbox" class="rounded border-slate-300 text-brand-700" /> Active for selection</label><p v-if="editingId" class="text-xs text-slate-500">Used currencies cannot change code/precision, be deactivated or deleted. Their name can still be updated.</p><p v-if="saveError" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{{ saveError }}</p><div class="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"><button type="button" class="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300" @click="showForm = false">Cancel</button><button type="submit" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800"><Check :size="14" />{{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Create currency' }}</button></div></fieldset></form>
    </section></div>
    <div v-if="host && deleteTarget" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" @click.self="!saving && (deleteTarget = null)"><section role="dialog" aria-modal="true" aria-labelledby="currency-delete-title" class="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]"><h2 id="currency-delete-title" class="text-base font-semibold text-slate-900 dark:text-white">Delete currency?</h2><p class="mt-2 text-sm text-slate-500">Soft-delete {{ deleteTarget.code }} — {{ deleteTarget.name }} for all companies? Any live financial or accounting-unit reference blocks deletion.</p><p v-if="deleteError" role="alert" class="mt-3 text-sm text-rose-600">{{ deleteError }}</p><div class="mt-5 flex justify-end gap-2"><button :disabled="saving" class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300" @click="deleteTarget = null">Cancel</button><button :disabled="saving" class="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white" @click="remove">{{ saving ? 'Deleting…' : 'Delete currency' }}</button></div></section></div>
  </div>
</template>
