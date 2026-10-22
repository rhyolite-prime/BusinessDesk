<script setup lang="ts">
import { Check, Pencil, Plus, Search, Trash2, X } from '@lucide/vue'
import { buildAccountHeadTree, filterAccountHeadTree } from '../../../features/ledger/account-head-tree'
definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Cost centers' })
interface CostCenter { id: string; name: string; parentId: string | null }
const request = useRequestFetch(), rows = ref<CostCenter[]>([]), loading = ref(true), saving = ref(false), error = ref(''), formError = ref(''), search = ref('')
const dialog = ref(false), editingId = ref<string | null>(null), deletion = ref<CostCenter | null>(null), form = reactive({ name: '', parentId: '' })
const tree = computed(() => buildAccountHeadTree(rows.value.map(row => ({ ...row, sortOrder: 0, standardAccountType: 'Asset' as const, isActive: true }))))
const visible = computed(() => filterAccountHeadTree(tree.value, search.value))
const rootCount = computed(() => rows.value.filter(row => !row.parentId).length)
const children = (id: string) => rows.value.filter(row => row.parentId === id).length
const names = computed(() => new Map(rows.value.map(row => [row.id, row.name])))
const parentOptions = computed(() => {
  const byId = new Map(rows.value.map(row => [row.id, row]))
  return tree.value.filter(({ head }) => {
    const seen = new Set<string>(); let node: CostCenter | undefined = head
    while (node && !seen.has(node.id)) { if (node.id === editingId.value) return false; seen.add(node.id); node = node.parentId ? byId.get(node.parentId) : undefined }
    return true
  })
})
const message = (e: any) => e?.data?.statusMessage || 'Request failed. Please retry.'
let version = 0
async function load() {
  const current = ++version; loading.value = true; error.value = ''
  try { const r = await request<{ data: CostCenter[] }>('/api/shared/cost-centers'); if (current === version) rows.value = r.data }
  catch (e) { if (current === version) { rows.value = []; error.value = message(e) } }
  finally { if (current === version) loading.value = false }
}
async function open(id?: string, parentId = '') {
  if (saving.value) return
  saving.value = true; formError.value = ''; error.value = ''
  try {
    // Refresh the complete hierarchy before editing parent choices as well as the record.
    await load(); if (error.value) return
    const row = id ? await request<CostCenter>(`/api/shared/cost-centers/${id}`) : null
    editingId.value = id || null; Object.assign(form, { name: row?.name || '', parentId: row?.parentId || parentId }); dialog.value = true
  } catch (e) { error.value = message(e) }
  finally { saving.value = false }
}
async function save() {
  if (saving.value) return
  saving.value = true; formError.value = ''
  try {
    const body = { name: form.name.trim(), parentId: form.parentId || null }
    if (editingId.value) await request(`/api/shared/cost-centers/${editingId.value}`, { method: 'PUT', body })
    else await request('/api/shared/cost-centers', { method: 'POST', body })
    dialog.value = false; await load()
  } catch (e) { formError.value = message(e) }
  finally { saving.value = false }
}
async function remove() {
  if (!deletion.value || saving.value) return
  saving.value = true; formError.value = ''
  try { await request(`/api/shared/cost-centers/${deletion.value.id}`, { method: 'DELETE' }); deletion.value = null; await load() }
  catch (e) { formError.value = message(e) }
  finally { saving.value = false }
}
onMounted(load)
onUnmounted(() => { version++ })
</script>
<template>
  <div class="space-y-6">
    <header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Shared config</div><h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Cost centers</h1><p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Organize your company’s cost centers into parent and child relationships.</p></div><button :disabled="loading || saving" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800 disabled:opacity-40" @click="open()"><Plus :size="15" />Add cost center</button></header>
    <section class="grid gap-3 sm:grid-cols-3"><div v-for="stat in [{ label: 'Cost centers', value: rows.length }, { label: 'Top-level centers', value: rootCount }, { label: 'Child centers', value: rows.length - rootCount }]" :key="stat.label" class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><p class="text-[11px] font-medium text-slate-500">{{ stat.label }}</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ stat.value }}</p></div></section>
    <p v-if="error" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{{ error }}</p>
    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-5 dark:border-slate-800"><div class="relative w-full sm:max-w-[360px]"><Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="search" aria-label="Search cost centers" type="search" placeholder="Search cost centers…" class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" /></div><button :disabled="loading || saving" class="text-xs font-semibold text-brand-700 disabled:opacity-40 dark:text-brand-300" @click="load">Refresh</button></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[720px] text-left"><thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="px-5 py-3">Cost center</th><th class="px-4 py-3">Parent center</th><th class="px-4 py-3">Children</th><th class="px-4 py-3 text-right">Actions</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800">
        <tr v-if="loading"><td colspan="4" role="status" class="p-10 text-center text-xs text-slate-400">Loading cost centers…</td></tr>
        <tr v-for="{ head, depth, path } in loading ? [] : visible" :key="head.id" class="hover:bg-slate-50/70 dark:hover:bg-slate-900/40"><td class="px-5 py-3.5"><div class="flex items-center gap-2" :style="{ paddingLeft: `${depth * 22}px` }"><span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[10px] font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{{ head.name.slice(0, 1) }}</span><span v-if="depth" aria-hidden="true" class="text-slate-400">↳</span><span :title="path" class="text-xs font-semibold text-slate-800 dark:text-slate-200">{{ head.name }}</span></div></td><td class="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">{{ head.parentId ? names.get(head.parentId) || 'Unavailable parent' : 'Top level' }}</td><td class="px-4 py-3.5 text-xs tabular-nums text-slate-500">{{ children(head.id) }}</td><td class="whitespace-nowrap px-4 py-3.5 text-right"><button :disabled="loading || saving" :aria-label="`Add child to ${head.name}`" title="Add child" class="rounded-md p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/30" @click="open(undefined, head.id)"><Plus :size="14" /></button><button :disabled="loading || saving" :aria-label="`Edit ${head.name}`" class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" @click="open(head.id)"><Pencil :size="14" /></button><button :disabled="loading || saving || children(head.id) > 0" :aria-label="`Delete ${head.name}`" :title="children(head.id) ? 'Move or delete children first' : 'Delete cost center'" class="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/30" @click="formError = ''; deletion = head"><Trash2 :size="14" /></button></td></tr>
        <tr v-if="!loading && !visible.length"><td colspan="4" class="p-10 text-center"><p class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ error ? 'Unable to load cost centers' : 'No cost centers found' }}</p><p class="mt-1 text-xs text-slate-400">{{ error ? 'Try Refresh to reload the hierarchy.' : 'Try another search or add a new cost center.' }}</p></td></tr>
      </tbody></table></div><footer class="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-800">{{ visible.length }} shown · {{ rows.length }} cost centers · Tenant directory</footer>
    </section>
    <div v-if="dialog" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="cost-center-title" class="max-h-[92vh] w-full max-w-lg overflow-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#172321]"><div class="flex justify-between"><h2 id="cost-center-title" class="text-lg font-semibold">{{ editingId ? 'Edit cost center' : 'New cost center' }}</h2><button :disabled="saving" aria-label="Close dialog" @click="dialog = false"><X :size="18" /></button></div><form class="mt-5" @submit.prevent="save"><fieldset :disabled="saving" class="space-y-4"><label class="block text-xs font-semibold">Name<input v-model="form.name" required maxlength="160" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700" /></label><label class="block text-xs font-semibold">Parent cost center<select v-model="form.parentId" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Top level (no parent)</option><option v-for="row in parentOptions" :key="row.head.id" :value="row.head.id">{{ row.path }}</option></select></label><p class="text-xs text-slate-400">A center cannot be its own parent or move beneath one of its descendants.</p><p v-if="formError" role="alert" class="text-xs text-rose-600">{{ formError }}</p><div class="flex justify-end gap-3 pt-3"><button type="button" class="px-3 text-xs text-slate-500" @click="dialog = false">Cancel</button><button class="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-3 text-xs font-semibold text-white"><Check :size="14" />{{ saving ? 'Saving…' : 'Save changes' }}</button></div></fieldset></form></section></div>
    <div v-if="deletion" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="cost-center-delete" class="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-[#172321]"><h2 id="cost-center-delete" class="font-semibold">Delete cost center?</h2><p class="mt-3 text-sm text-slate-500">Soft-delete {{ deletion.name }}? Centers with live children or financial references cannot be deleted.</p><p v-if="formError" role="alert" class="mt-3 text-xs text-rose-600">{{ formError }}</p><div class="mt-5 flex justify-end gap-3"><button :disabled="saving" class="px-3 text-xs" @click="deletion = null">Cancel</button><button :disabled="saving" class="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white" @click="remove">{{ saving ? 'Deleting…' : 'Delete cost center' }}</button></div></section></div>
  </div>
</template>
