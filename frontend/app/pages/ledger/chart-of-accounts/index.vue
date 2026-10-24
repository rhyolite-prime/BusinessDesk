<script setup lang="ts">
import { Check, ChevronDown, Pencil, Plus, Search, Trash2, X } from '@lucide/vue'
import type { StandardAccountType, LedgerAccountHead } from '../../../features/ledger/setup-data'
import { standardAccountTypes } from '../../../features/ledger/setup-data'
import { buildAccountHeadTree, filterAccountHeadTree } from '../../../features/ledger/account-head-tree'

definePageMeta({ layout: 'admin-ledger' })
const request = useRequestFetch()
const units = ref<{ id: string; name: string; code: string }[]>([])
const unitId = ref('')
const heads = ref<LedgerAccountHead[]>([])
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const deleteError = ref('')
let loadVersion = 0
const setup = {
  accountHeads: heads,
  accountHeadPath(id: string) {
    return treeRows.value.find(row => row.head.id === id)?.path || ''
  },
}
function mapHead(row: any, index: number): LedgerAccountHead {
  return { id: row.id, name: row.name, parentId: row.parentId || null, isActive: row.isActive,
    standardAccountType: standardAccountTypes[row.accountType]!, sortOrder: index }
}
function message(error: any) { return error?.data?.statusMessage || error?.message || 'Request failed. Please retry.' }
async function loadHeads() {
  const version = ++loadVersion
  heads.value = []; loadError.value = ''; showForm.value = false; deleteTarget.value = null
  if (!unitId.value) return
  loading.value = true
  const selectedUnit = unitId.value
  try {
    const rows: LedgerAccountHead[] = []
    // Fetch every page for correct hierarchy/parent choices; never mix demo data.
    for (let pageNo = 1; ; pageNo++) {
      const result = await request<any>('/api/ledger/account-heads', { query: { accountingUnitId: selectedUnit, pageNo, pageSize: 200 } })
      if (version !== loadVersion) return
      if (pageNo > 50) throw new Error('Too many heads to display. Contact your administrator.')
      rows.push(...result.data.map((row: any, index: number) => mapHead(row, rows.length + index)))
      if (pageNo >= result.totalPages || !result.data.length) break
    }
    heads.value = rows
  } catch (error) { if (version === loadVersion) loadError.value = message(error) }
  finally { if (version === loadVersion) loading.value = false }
}
watch(unitId, () => { void loadHeads() })
onMounted(async () => {
  loading.value = true
  try {
    units.value = await request('/api/ledger/account-head-units')
    if (units.value[0]) unitId.value = units.value[0].id
  } catch (error) { loadError.value = message(error) }
  finally { if (!unitId.value) loading.value = false }
})
onUnmounted(() => { loadVersion++ })
const search = ref('')
const typeFilter = ref('')
const showForm = ref(false)
const editingId = ref<string | null>(null)
const deleteTarget = ref<string | null>(null)
const saveError = ref('')
const form = reactive({ name: '', parentId: '', standardAccountType: 'Asset' as StandardAccountType, isActive: true })

// Child heads inherit their parent's classification. Roots remain editable.
watch(() => form.parentId, parentId => {
  const parent = heads.value.find(head => head.id === parentId)
  if (parent) form.standardAccountType = parent.standardAccountType
})

const activeCount = computed(() => setup.accountHeads.value.filter((head) => head.isActive).length)
const rootCount = computed(() => setup.accountHeads.value.filter((head) => !head.parentId).length)
const parentChoices = computed(() => {
  const excluded = new Set<string>()
  if (editingId.value) {
    const collectDescendants = (parentId: string) => {
      for (const child of setup.accountHeads.value.filter((head) => head.parentId === parentId)) {
        if (!excluded.has(child.id)) { excluded.add(child.id); collectDescendants(child.id) }
      }
    }
    excluded.add(editingId.value)
    collectDescendants(editingId.value)
  }
  return treeRows.value.map(row => row.head).filter((head) => !excluded.has(head.id) && head.isActive)
})
const treeRows = computed(() => buildAccountHeadTree(heads.value))
const visibleHeads = computed(() => filterAccountHeadTree(treeRows.value, search.value, typeFilter.value))

function directChildrenCount(id: string) {
  return setup.accountHeads.value.filter((head) => head.parentId === id).length
}

function canDelete(id: string) {
  return !setup.accountHeads.value.some((head) => head.parentId === id)

}

function openCreate() {
  editingId.value = null
  saveError.value = ''
  Object.assign(form, { name: '', parentId: '', standardAccountType: 'Asset', isActive: true })
  showForm.value = true
}

async function openEdit(id: string) {
  if (saving.value || loading.value) return
  saving.value = true; loadError.value = ''; saveError.value = ''
  try {
    const row = await request<any>(`/api/ledger/account-heads/${id}`, { query: { accountingUnitId: unitId.value } })
    const head = mapHead(row, 0)
    editingId.value = id
    Object.assign(form, { name: head.name, parentId: head.parentId || '', standardAccountType: head.standardAccountType, isActive: head.isActive })
    showForm.value = true
  } catch (error) { loadError.value = message(error) }
  finally { saving.value = false }
}

async function saveHead() {
  if (saving.value || loading.value) return
  saveError.value = ''
  const name = form.name.trim()
  if (!name) { saveError.value = 'Enter an account head name.'; return }
  saving.value = true
  try {
    const body = { accountingUnitId: unitId.value, name, parentId: form.parentId || null,
      accountType: standardAccountTypes.indexOf(form.standardAccountType), isActive: form.isActive }
    if (editingId.value) await request(`/api/ledger/account-heads/${editingId.value}`, { method: 'PUT', body })
    else await request('/api/ledger/account-heads', { method: 'POST', body })
    showForm.value = false
    await loadHeads()
  } catch (error) { saveError.value = message(error) }
  finally { saving.value = false }
}
async function deleteHead() {
  if (!deleteTarget.value || saving.value) return
  saving.value = true; deleteError.value = ''
  try {
    await request(`/api/ledger/account-heads/${deleteTarget.value}`, { method: 'DELETE', query: { accountingUnitId: unitId.value } })
    deleteTarget.value = null
    await loadHeads()
  } catch (error) { deleteError.value = message(error) }
  finally { saving.value = false }
}

</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end gap-3">
      <label class="text-sm font-semibold">Accounting unit
        <select v-model="unitId" :disabled="saving" class="ml-3 rounded-lg border border-slate-300 bg-white p-2 dark:bg-slate-900">
          <option value="" disabled>Select an accounting unit</option>
          <option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.code }} — {{ unit.name }}</option>
        </select>
      </label>
      <button :disabled="loading || saving" class="text-sm underline" @click="unitId ? loadHeads() : reloadNuxtApp()">Refresh</button>
    </div>
    <p v-if="loadError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ loadError }}</p>
    <p v-else-if="loading" role="status" class="text-sm text-slate-500">Loading account heads…</p>
    <p v-else-if="!units.length" class="text-sm text-slate-500">No active accounting units are available. <NuxtLink to="/ledger/accounting-units" class="font-semibold underline">Create or activate an accounting unit</NuxtLink> before adding heads.</p>
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Account Setup</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Chart of Accounts</h1>
        <p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Build the Chart of Accounts hierarchy and assign each head its standard account type.</p>
      </div>
      <button class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800" :disabled="!unitId || loading || saving" @click="openCreate"><Plus :size="15" /> Add To Chart of Account </button>
    </section>

    <section class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <p class="text-[11px] font-medium text-slate-500">Account heads</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ setup.accountHeads.value.length }}</p>
      </div>
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <p class="text-[11px] font-medium text-slate-500">Top-level heads</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ rootCount }}</p>
      </div>
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <p class="text-[11px] font-medium text-slate-500">Active heads</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ activeCount }}</p>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800">
        <div class="relative w-full sm:max-w-[360px]">
          <Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="search" type="search" placeholder="Search account heads…" class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" />
        </div>
        <div class="flex items-center gap-2">
          <label class="relative">
            <select v-model="typeFilter" class="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-600 outline-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <option value="">All account types</option><option v-for="type in standardAccountTypes" :key="type" :value="type">{{ type }}</option>
            </select>
            <ChevronDown :size="13" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </label>
          <span class="hidden rounded-md bg-slate-50 px-2.5 py-2 text-[10px] text-slate-400 sm:inline-flex dark:bg-slate-800">{{ visibleHeads.length }} records</span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50">
            <tr><th class="px-5 py-3">Account head</th><th class="px-4 py-3">Standard type</th><th class="px-4 py-3">Parent head</th><th class="px-4 py-3">Sub-heads</th><th class="px-4 py-3">Status</th><th class="w-24 px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="{ head, depth } in visibleHeads" :key="head.id" class="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-2" :style="{ paddingLeft: `${depth * 22}px` }">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"><span class="text-[10px] font-bold">{{ head.name.slice(0, 1) }}</span></span>
                  <span v-if="depth" aria-hidden="true" class="text-slate-400">↳</span>
                  <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">{{ head.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3.5"><span class="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ head.standardAccountType }}</span></td>
              <td class="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">{{ head.parentId ? setup.accountHeads.value.find((parent) => parent.id === head.parentId)?.name : 'Top level' }}</td>
              <td class="px-4 py-3.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">{{ directChildrenCount(head.id) }}</td>
              <td class="px-4 py-3.5"><span class="inline-flex items-center gap-1.5 text-[10px] font-medium" :class="head.isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'"><span class="h-1.5 w-1.5 rounded-full" :class="head.isActive ? 'bg-emerald-500' : 'bg-slate-300'" />{{ head.isActive ? 'Active' : 'Inactive' }}</span></td>
              <td class="px-4 py-3.5 text-right">
                <button class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Edit account head" :disabled="saving || loading" @click="openEdit(head.id)"><Pencil :size="14" /></button>
                <button class="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/30" aria-label="Delete account head" :title="canDelete(head.id) ? 'Delete account head' : 'Remove child heads and controls before deleting'" :disabled="saving || loading || !canDelete(head.id)" @click="deleteError = ''; deleteTarget = head.id"><Trash2 :size="14" /></button>
              </td>
            </tr>
            <tr v-if="!loading && !loadError && unitId && !visibleHeads.length"><td colspan="6" class="px-5 py-12 text-center"><p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No account heads found</p><p class="mt-1 text-xs text-slate-400">Try another search or add a new account head.</p></td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:flex-row dark:border-slate-800">
        <span>Saved to the backend for the selected accounting unit.</span>
        <NuxtLink to="/ledger/account-controls" class="font-semibold text-brand-700 hover:underline dark:text-brand-300">Continue to account controls →</NuxtLink>
      </div>
    </section>

    <div v-if="showForm" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" @click.self="!saving && (showForm = false)">
      <section class="w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <div class="flex items-start justify-between">
          <div><h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ editingId ? 'Edit account head' : 'New account head' }}</h2><p class="mt-1 text-xs text-slate-500">Set the head name, hierarchy, and standard accounting type.</p></div>
          <button class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close dialog" :disabled="saving" @click="showForm = false"><X :size="17" /></button>
        </div>
        <form class="mt-5 space-y-4" @submit.prevent="saveHead"><fieldset :disabled="saving" class="space-y-4">
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Account head name</span><input v-model="form.name" required maxlength="160" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" placeholder="e.g. Current Assets" /></label>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Parent head</span><select v-model="form.parentId" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="">Top level</option><option v-for="head in parentChoices" :key="head.id" :value="head.id">{{ setup.accountHeadPath(head.id) }}</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Standard account type</span><select v-model="form.standardAccountType" :disabled="!!form.parentId" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option v-for="type in standardAccountTypes" :key="type" :value="type">{{ type }}</option></select><span v-if="form.parentId" class="mt-1 block text-[10px] font-normal text-slate-400">Inherited from the selected parent head.</span></label>
          </div>
          <label class="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"><input v-model="form.isActive" type="checkbox" class="rounded border-slate-300 text-brand-700 focus:ring-brand-500" /> Active for account setup</label>
          <p v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ saveError }}</p>
          <div class="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" class="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" :disabled="saving" @click="showForm = false">Cancel</button>
            <button type="submit" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800"><Check :size="14" />{{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Create head' }}</button>
          </div>
        </fieldset></form>
      </section>
    </div>

    <div v-if="deleteTarget" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" @click.self="!saving && (deleteTarget = null)">
      <section class="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Delete account head?</h2>
        <p class="mt-2 text-sm text-slate-500">This soft-deletes the head. Heads with dependent heads, controls or accounts cannot be deleted.</p>
        <p v-if="deleteError" role="alert" class="mt-3 text-sm text-rose-600">{{ deleteError }}</p>
        <div class="mt-5 flex justify-end gap-2"><button class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300" :disabled="saving" @click="deleteTarget = null">Cancel</button><button class="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700" :disabled="saving" @click="deleteHead">{{ saving ? 'Deleting…' : 'Delete head' }}</button></div>
      </section>
    </div>
  </div>
</template>
