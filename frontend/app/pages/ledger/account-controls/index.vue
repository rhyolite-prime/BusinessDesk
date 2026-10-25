<script setup lang="ts">
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Search, Trash2, X } from '@lucide/vue'
import type { LedgerAccountControl, LedgerAccountHead } from '../../../features/ledger/setup-data'
import { standardAccountTypes } from '../../../features/ledger/setup-data'
import { buildAccountHeadTree } from '../../../features/ledger/account-head-tree'

definePageMeta({ layout: 'admin-ledger' })
const request = useRequestFetch()
const addButton = ref<HTMLButtonElement | null>(null)
const units = ref<{ id: string; name: string; code: string }[]>([])
const unitId = ref('')
const controls = ref<LedgerAccountControl[]>([])
const heads = ref<LedgerAccountHead[]>([])
const loading = ref(true), saving = ref(false)
const loadError = ref(''), deleteError = ref('')
let loadVersion = 0
const headRows = computed(() => buildAccountHeadTree(heads.value))
const setup = {
  accountControls: controls,
  accountHeads: heads,
  accountHeadPath(id: string) { return headRows.value.find(row => row.head.id === id)?.path || 'Unavailable head' },
  accountControlPath(id: string) {
    const names: string[] = [], seen = new Set<string>()
    let control = controls.value.find(item => item.id === id)
    while (control && !seen.has(control.id)) {
      seen.add(control.id); names.unshift(control.accountHeaderName)
      control = controls.value.find(item => item.id === control?.parentAccountHeaderId)
    }
    return names.join(' / ')
  },
}
const errorMessage = (error: any) => error?.data?.statusMessage || error?.message || 'Request failed. Please retry.'
async function allPages(resource: string, unit: string, version: number) {
  const rows: any[] = []
  for (let pageNo = 1; ; pageNo++) {
    if (pageNo > 50) throw new Error('Too many records to display. Contact your administrator.')
    const result = await request<any>(`/api/ledger/${resource}`, { query: { accountingUnitId: unit, pageNo, pageSize: 200 } })
    if (version !== loadVersion) return []
    rows.push(...result.data)
    if (!result.data.length || pageNo >= result.totalPages) return rows
  }
}
async function loadControls() {
  const version = ++loadVersion, unit = unitId.value
  controls.value = []; heads.value = []; showForm.value = false; deleteTarget.value = null; loadError.value = ''
  if (!unit) { loading.value = false; return }
  loading.value = true
  try {
    const [controlRows, groupRows] = await Promise.all([allPages('account-controls', unit, version), allPages('account-heads', unit, version)])
    if (version !== loadVersion) return
    controls.value = controlRows
    heads.value = groupRows.map((row, index) => ({ id: row.id, name: row.name, parentId: row.parentId || null, isActive: row.isActive, standardAccountType: standardAccountTypes[row.accountType]!, sortOrder: index }))
    expandedControlIds.value = new Set(controlRows.map(row => row.id))
  } catch (error) { if (version === loadVersion) loadError.value = errorMessage(error) }
  finally { if (version === loadVersion) loading.value = false }
}
watch(unitId, () => { groupFilter.value = ''; search.value = ''; void loadControls() })
onMounted(async () => {
  try { units.value = await request('/api/ledger/account-head-units'); if (units.value[0]) unitId.value = units.value[0].id }
  catch (error) { loadError.value = errorMessage(error) }
  finally { if (!unitId.value) loading.value = false }
})
onUnmounted(() => { loadVersion++ })
const search = ref('')
const groupFilter = ref('')
const showForm = ref(false)
const editingId = ref<string | null>(null)
const deleteTarget = ref<string | null>(null)
const saveError = ref('')
const form = reactive({ accountGroupId: '', parentAccountHeaderId: '', minAccount: 0, maxAccount: 0, isActive: true })

// Always derive the stored name from the selected head, including when editing.
const accountHeaderName = computed(() => headRows.value.find(row => row.head.id === form.accountGroupId)?.path || '')

const expandedControlIds = ref(new Set<string>())
const isSearching = computed(() => Boolean(search.value.trim()))
const activeControls = computed(() => setup.accountControls.value.filter((control) => control.isActive).length)
const capacity = computed(() => {
  const rangesByGroup = new Map<string, Array<[number, number]>>()
  for (const control of setup.accountControls.value) {
    const ranges = rangesByGroup.get(control.accountGroupId) || []
    ranges.push([control.minAccount, control.maxAccount])
    rangesByGroup.set(control.accountGroupId, ranges)
  }
  let total = 0
  for (const ranges of rangesByGroup.values()) {
    ranges.sort((a, b) => a[0] - b[0])
    let start: number | null = null
    let end = -1
    for (const [nextStart, nextEnd] of ranges) {
      if (start === null) {
        start = nextStart
        end = nextEnd
      } else if (nextStart <= end + 1) {
        end = Math.max(end, nextEnd)
      } else {
        total += end - start + 1
        start = nextStart
        end = nextEnd
      }
    }
    if (start !== null) total += end - start + 1
  }
  return total
})
const availableGroups = computed(() => headRows.value.map(row => row.head).filter(head => head.isActive))
const parentChoices = computed(() => {
  const excluded = new Set<string>()
  if (editingId.value) {
    const collectDescendants = (parentId: string) => {
      for (const child of setup.accountControls.value.filter((control) => control.parentAccountHeaderId === parentId)) {
        if (!excluded.has(child.id)) { excluded.add(child.id); collectDescendants(child.id) }
      }
    }
    excluded.add(editingId.value)
    collectDescendants(editingId.value)
  }
  return setup.accountControls.value.filter((control) => control.isActive && control.id !== editingId.value && control.accountGroupId === form.accountGroupId && !excluded.has(control.id))
})
const visibleControls = computed(() => {
  const term = search.value.trim().toLowerCase()
  const inGroup = setup.accountControls.value.filter((control) => !groupFilter.value || control.accountGroupId === groupFilter.value)
  if (!term) return inGroup.sort((a, b) => a.minAccount - b.minAccount)

  const matches = inGroup.filter((control) => `${control.accountHeaderName} ${control.minAccount} ${control.maxAccount} ${setup.accountControlPath(control.id)} ${setup.accountHeadPath(control.accountGroupId)}`.toLowerCase().includes(term))
  const includeIds = new Set(matches.map((control) => control.id))
  const byId = new Map(setup.accountControls.value.map((control) => [control.id, control]))
  for (const match of matches) {
    let parentId = match.parentAccountHeaderId
    const visited = new Set<string>()
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId)
      includeIds.add(parentId)
      parentId = byId.get(parentId)?.parentAccountHeaderId || null
    }
  }
  return inGroup.filter((control) => includeIds.has(control.id)).sort((a, b) => a.minAccount - b.minAccount)
})
const treeRows = computed(() => {
  const childrenByParent = new Map<string, LedgerAccountControl[]>()
  for (const control of visibleControls.value) {
    if (!control.parentAccountHeaderId) continue
    const children = childrenByParent.get(control.parentAccountHeaderId) || []
    children.push(control)
    childrenByParent.set(control.parentAccountHeaderId, children)
  }
  for (const children of childrenByParent.values()) children.sort((a, b) => a.minAccount - b.minAccount)

  const roots = visibleControls.value.filter((control) => !control.parentAccountHeaderId || !visibleControls.value.some((parent) => parent.id === control.parentAccountHeaderId))
  const rows: Array<{ control: LedgerAccountControl; depth: number; hasChildren: boolean }> = []
  const visited = new Set<string>()
  const visit = (controls: LedgerAccountControl[], depth: number) => {
    for (const control of controls) {
      if (visited.has(control.id)) continue
      visited.add(control.id)
      const children = childrenByParent.get(control.id) || []
      rows.push({ control, depth, hasChildren: children.length > 0 })
      if (children.length && (isSearching.value || expandedControlIds.value.has(control.id))) visit(children, depth + 1)
    }
  }
  visit(roots.sort((a, b) => a.minAccount - b.minAccount), 0)
  return rows
})

function isExpanded(id: string) {
  return isSearching.value || expandedControlIds.value.has(id)
}

function toggleExpanded(id: string) {
  const next = new Set(expandedControlIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedControlIds.value = next
}

watch(() => form.accountGroupId, (groupId) => {
  if (form.parentAccountHeaderId && !setup.accountControls.value.some((control) => control.id === form.parentAccountHeaderId && control.accountGroupId === groupId && control.isActive)) {
    form.parentAccountHeaderId = ''
  }
})

function canDelete(id: string) {
  // The backend authoritatively checks linked ledger accounts on deletion.
  return !saving.value && !loading.value && !controls.value.some(control => control.parentAccountHeaderId === id)
}
function deleteControlTitle(id: string) {
  return controls.value.some(control => control.parentAccountHeaderId === id) ? 'Remove child controls first' : 'Delete account control (backend checks account usage)'
}

function openCreate() {
  editingId.value = null
  saveError.value = ''
  Object.assign(form, { accountGroupId: availableGroups.value[0]?.id || '', parentAccountHeaderId: '', minAccount: 0, maxAccount: 0, isActive: true })
  showForm.value = true
}

async function openEdit(control: LedgerAccountControl) {
  if (loading.value || saving.value) return
  saving.value = true; saveError.value = ''; loadError.value = ''
  try {
    const row = await request<LedgerAccountControl>(`/api/ledger/account-controls/${control.id}`, { query: { accountingUnitId: unitId.value } })
    editingId.value = row.id
    Object.assign(form, { accountGroupId: row.accountGroupId, parentAccountHeaderId: row.parentAccountHeaderId || '', minAccount: row.minAccount, maxAccount: row.maxAccount, isActive: row.isActive })
    showForm.value = true
  } catch (error) { loadError.value = errorMessage(error) }
  finally { saving.value = false }
}

async function saveControl() {
  if (saving.value || loading.value) return
  saveError.value = ''
  const name = accountHeaderName.value.trim()
  const min = Number(form.minAccount)
  const max = Number(form.maxAccount)
  if (!form.accountGroupId || !setup.accountHeads.value.some((head) => head.id === form.accountGroupId && head.isActive)) {
    saveError.value = 'Select an active chart-of-accounts head.'
    return
  }
  if (!name) {
    saveError.value = 'Select an available chart-of-accounts head.'
    return
  }
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < 0 || max < min || max > 2147483647) {
    saveError.value = 'Enter a valid whole-number range where the maximum is not less than the minimum.'
    return
  }
  const parent = setup.accountControls.value.find((control) => control.id === form.parentAccountHeaderId && control.accountGroupId === form.accountGroupId && control.isActive)
  if (form.parentAccountHeaderId && (!parent || min < parent.minAccount || max > parent.maxAccount)) {
    saveError.value = 'The range must fit inside the selected active parent control range.'
    return
  }
  const existingChildren = editingId.value ? setup.accountControls.value.filter((control) => control.parentAccountHeaderId === editingId.value) : []
  if (existingChildren.some((child) => child.minAccount < min || child.maxAccount > max)) {
    saveError.value = 'Expand this range to contain its existing child controls, or update those controls first.'
    return
  }
  const overlapsSibling = setup.accountControls.value.some((control) => control.id !== editingId.value
    && control.accountGroupId === form.accountGroupId
    && control.parentAccountHeaderId === (form.parentAccountHeaderId || null)
    && min <= control.maxAccount && max >= control.minAccount)
  if (overlapsSibling) {
    saveError.value = 'This number range overlaps another control under the same parent.'
    return
  }
  if (setup.accountControls.value.some((control) => control.id !== editingId.value && control.accountGroupId === form.accountGroupId && control.parentAccountHeaderId === (form.parentAccountHeaderId || null) && control.accountHeaderName.toLowerCase() === name.toLowerCase())) {
    saveError.value = 'A header with this name already exists under the selected parent.'
    return
  }
  saving.value = true
  try {
    const body = { accountingUnitId: unitId.value, accountGroupId: form.accountGroupId, parentAccountHeaderId: form.parentAccountHeaderId || null,
      accountHeaderName: name, minAccount: min, maxAccount: max, isActive: form.isActive }
    if (editingId.value) await request(`/api/ledger/account-controls/${editingId.value}`, { method: 'PUT', body })
    else await request('/api/ledger/account-controls', { method: 'POST', body })
    showForm.value = false
    await loadControls()
  } catch (error) { saveError.value = errorMessage(error) }
  finally { saving.value = false }
}
async function deleteControl() {
  if (!deleteTarget.value || saving.value) return
  saving.value = true; deleteError.value = ''
  try {
    await request(`/api/ledger/account-controls/${deleteTarget.value}`, { method: 'DELETE', query: { accountingUnitId: unitId.value } })
    deleteTarget.value = null
    await loadControls()
  } catch (error) { deleteError.value = errorMessage(error) }
  finally { saving.value = false }
}

</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-3">
      <label class="text-sm font-semibold">Accounting unit <select v-model="unitId" :disabled="saving" class="ml-2 rounded-lg border bg-white p-2 dark:bg-slate-900"><option value="" disabled>Select a unit</option><option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.code }} — {{ unit.name }}</option></select></label>
      <button :disabled="loading || saving" class="text-sm underline" @click="unitId ? loadControls() : reloadNuxtApp()">Refresh</button>
    </div>
    <p v-if="loadError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ loadError }}</p>
    <p v-else-if="loading" role="status" class="text-sm text-slate-500">Loading account controls…</p>
    <p v-else-if="!units.length" class="text-sm text-slate-500">No active accounting units. <NuxtLink to="/ledger/accounting-units" class="underline">Create or activate a unit</NuxtLink> first.</p>
    <p v-else-if="!availableGroups.length" class="text-sm text-slate-500">No active account heads. <NuxtLink to="/ledger/account-heads" class="underline">Create or activate a head</NuxtLink> before adding controls.</p>
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Account Setup</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Chart of Account Control</h1>
        <p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Define account headers, parent relationships, and permitted account-number ranges.</p>
      </div>
      <button ref="addButton" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800" :disabled="loading || saving || !unitId || !availableGroups.length" @click="openCreate"><Plus :size="15" /> Add control header</button>
    </section>


    <section class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><p class="text-[11px] font-medium text-slate-500">Control headers</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ setup.accountControls.value.length }}</p></div>
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><p class="text-[11px] font-medium text-slate-500">Active headers</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ activeControls }}</p></div>
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><p class="text-[11px] font-medium text-slate-500">Numbers covered</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ capacity.toLocaleString() }}</p></div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800">
        <div class="relative w-full sm:max-w-[330px]"><Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="search" type="search" placeholder="Search headers or account range…" class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" /></div>
        <div class="flex items-center gap-2">
          <label class="relative"><select v-model="groupFilter" class="h-10 max-w-[240px] appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-600 outline-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><option value="">All chart heads</option><option v-for="head in availableGroups" :key="head.id" :value="head.id">{{ setup.accountHeadPath(head.id) }}</option></select><ChevronDown :size="13" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" /></label>
          <span class="hidden rounded-md bg-slate-50 px-2.5 py-2 text-[10px] text-slate-400 sm:inline-flex dark:bg-slate-800">{{ visibleControls.length }} records</span>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[820px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="px-5 py-3">Hierarchy name</th><th class="px-4 py-3">Chart of account</th><th class="px-4 py-3">Account range</th><th class="px-4 py-3 text-right">Capacity</th><th class="px-4 py-3">Status</th><th class="w-24 px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="{ control, depth, hasChildren } in treeRows" :key="control.id" class="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
              <td class="px-5 py-3.5"><div class="flex items-center gap-2" :style="{ paddingLeft: `${depth * 20}px` }"><button v-if="hasChildren" type="button" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-default dark:hover:bg-slate-800 dark:hover:text-white" :disabled="isSearching" :aria-label="isExpanded(control.id) ? 'Collapse child controls' : 'Expand child controls'" :aria-expanded="isExpanded(control.id)" @click="toggleExpanded(control.id)"><ChevronDown v-if="isExpanded(control.id)" :size="14" /><ChevronRight v-else :size="14" /></button><span v-else class="w-7 shrink-0" /><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700"><span class="text-[10px] font-bold">{{ control.accountHeaderName.slice(0, 2).toUpperCase() }}</span></span><span><span class="block text-xs font-semibold text-slate-800 dark:text-slate-200">{{ control.accountHeaderName }}</span><span v-if="control.parentAccountHeaderId" class="mt-0.5 block text-[10px] text-slate-400">{{ setup.accountControlPath(control.id) }}</span></span></div></td>
              <td class="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">{{ setup.accountHeadPath(control.accountGroupId) }}</td>
              <td class="px-4 py-3.5 font-mono text-xs text-slate-700 dark:text-slate-300">{{ control.minAccount }}–{{ control.maxAccount }}</td>
              <td class="px-4 py-3.5 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">{{ (control.maxAccount - control.minAccount + 1).toLocaleString() }}</td>
              <td class="px-4 py-3.5"><span class="inline-flex items-center gap-1.5 text-[10px] font-medium" :class="control.isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'"><span class="h-1.5 w-1.5 rounded-full" :class="control.isActive ? 'bg-emerald-500' : 'bg-slate-300'" />{{ control.isActive ? 'Active' : 'Inactive' }}</span></td>
              <td class="px-4 py-3.5 text-right"><button class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Edit account control" :disabled="loading || saving" @click="openEdit(control)"><Pencil :size="14" /></button><button class="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/30" aria-label="Delete account control" :title="deleteControlTitle(control.id)" :disabled="!canDelete(control.id)" @click="deleteError = ''; deleteTarget = control.id"><Trash2 :size="14" /></button></td>
            </tr>
            <tr v-if="!loading && !loadError && unitId && !visibleControls.length"><td colspan="6" class="px-5 py-12 text-center"><p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No control headers found</p><p class="mt-1 text-xs text-slate-400">Try another filter or add a control header to this chart.</p></td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:flex-row dark:border-slate-800"><span>Number ranges are inclusive; child controls can refine their parent range.</span><NuxtLink to="/ledger/accounts" class="font-semibold text-brand-700 hover:underline dark:text-brand-300">Continue to account details →</NuxtLink></div>
    </section>

    <div v-if="showForm" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" @click.self="!saving && (showForm = false)">
      <section class="max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <div class="flex items-start justify-between"><div><h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ editingId ? 'Edit account control' : 'New account control' }}</h2><p class="mt-1 text-xs text-slate-500">Set the chart head, parent header, and allowed account-number range.</p></div><button class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close dialog" :disabled="saving" @click="showForm = false"><X :size="17" /></button></div>
        <form class="mt-5 space-y-4" @submit.prevent="saveControl"><fieldset :disabled="saving" class="space-y-4">
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Chart of account</span><select v-model="form.accountGroupId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="">Select chart head</option><option v-if="form.accountGroupId && !availableGroups.some(head => head.id === form.accountGroupId)" :value="form.accountGroupId" disabled>Current head is inactive/unavailable</option><option v-for="head in availableGroups" :key="head.id" :value="head.id">{{ setup.accountHeadPath(head.id) }}</option></select></label>
          <div class="grid gap-4 sm:grid-cols-3">
            <label class="block sm:col-span-1"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Minimum account no.</span><input v-model.number="form.minAccount" type="number" min="0" max="2147483647" step="1" required class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block sm:col-span-1"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Maximum account no.</span><input v-model.number="form.maxAccount" type="number" min="0" max="2147483647" step="1" required class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block sm:col-span-1"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Parent header</span><select v-model="form.parentAccountHeaderId" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="">No parent</option><option v-for="control in parentChoices" :key="control.id" :value="control.id">{{ setup.accountControlPath(control.id) }}</option></select></label>
          </div>
          <label class="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"><input v-model="form.isActive" type="checkbox" class="rounded border-slate-300 text-brand-700 focus:ring-brand-500" /> Active for account setup</label>
          <p v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ saveError }}</p>
          <div class="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"><button type="button" class="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" :disabled="saving" @click="showForm = false">Cancel</button><button type="submit" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800"><Check :size="14" />{{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Create control' }}</button></div>
        </fieldset></form>
      </section>
    </div>

    <div v-if="deleteTarget" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" @click.self="!saving && (deleteTarget = null)"><section class="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]"><h2 class="text-base font-semibold text-slate-900 dark:text-white">Delete control header?</h2><p class="mt-2 text-sm text-slate-500">This soft-deletes the saved control. Controls with live child controls or ledger accounts cannot be deleted.</p><p v-if="deleteError" role="alert" class="mt-3 text-sm text-rose-600">{{ deleteError }}</p><div class="mt-5 flex justify-end gap-2"><button class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300" :disabled="saving" @click="deleteTarget = null">Cancel</button><button class="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700" :disabled="saving" @click="deleteControl">{{ saving ? 'Deleting…' : 'Delete header' }}</button></div></section></div>
    <ScrollAddFab :target="addButton" label="Add control header" :disabled="loading || saving || !unitId || !availableGroups.length" :hidden="showForm || !!deleteTarget" @click="openCreate" />
  </div>
</template>
