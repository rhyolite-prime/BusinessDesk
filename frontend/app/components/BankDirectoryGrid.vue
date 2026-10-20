<script setup lang="ts">
import { ChevronDown, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Pencil, Plus, Trash2, Search, RotateCw } from '@lucide/vue'
interface Row { id: string; name: string; bankCode?: string; contactPerson: string; contactNo: string; email: string }
interface GridState { rows: Row[]; page: number; pages: number; total: number; query: string; loading: boolean; error: string }
const props = withDefaults(defineProps<{ table: GridState; selected?: Row | null; branch?: boolean; busy?: boolean }>(), { selected: null, branch: false, busy: false })
const emit = defineEmits<{ create: []; edit: [row: Row]; remove: [row: Row]; select: [row: Row]; toggle: [row: Row]; search: []; refresh: []; paginate: [step: number]; query: [value: string] }>()
const label = computed(() => props.branch ? 'branch' : 'bank')
</script>
<template>
  <section class="directory-grid" :aria-label="branch ? 'Bank branches child table' : 'Banks header table'" :aria-busy="table.loading">
    <div class="grid-toolbar" role="toolbar" :aria-label="`${branch ? 'Branch' : 'Bank'} actions`">
      <button type="button" :disabled="busy || table.loading" :aria-label="`Add ${label}`" :title="`Add ${label}`" @click="emit('create')"><Plus :size="17" :stroke-width="3" /></button>
      <button type="button" :disabled="busy || table.loading || !selected" :aria-label="`Edit ${label}`" :title="selected ? `Edit ${selected.name}` : `Select a ${label} to edit`" @click="selected && emit('edit', selected)"><Pencil :size="14" /></button>
      <button type="button" :disabled="busy || table.loading || !selected" :aria-label="`Delete ${label}`" :title="selected ? `Delete ${selected.name}` : `Select a ${label} to delete`" @click="selected && emit('remove', selected)"><Trash2 :size="14" /></button>
      <span class="toolbar-divider" />
      <form class="grid-search" @submit.prevent="emit('search')"><input :value="table.query" :disabled="busy" :aria-label="branch ? 'Search branches' : 'Search banks'" type="search" maxlength="160" @input="emit('query', ($event.target as HTMLInputElement).value)" /><button :disabled="busy || table.loading" type="submit" :aria-label="`Search ${branch ? 'branches' : 'banks'}`" title="Search"><Search :size="15" /></button></form>
      <button type="button" :disabled="busy || table.loading" :aria-label="`Refresh ${branch ? 'branches' : 'banks'}`" title="Refresh" @click="emit('refresh')"><RotateCw :size="14" :class="{ 'animate-spin': table.loading }" /></button>
      <span v-if="branch" class="ml-auto pr-2 text-[11px] text-neutral-500 dark:text-neutral-400">Branches</span>
    </div>
    <p v-if="table.error" role="alert" class="border-b border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{{ table.error }}</p>
    <div class="grid-scroll"><table :class="{ 'branch-table': branch }"><caption class="sr-only">{{ branch ? 'Bank branches' : 'Banks and branches' }}</caption><thead><tr><th v-if="!branch" class="expand-column"><span class="sr-only">Expand branches</span></th><th>{{ branch ? 'Bank Branch' : 'Bank Name' }}</th><th>Contact Person</th><th>Contact No</th><th>Email</th><th v-if="!branch">Bank Code</th></tr></thead>
      <tbody>
        <tr v-if="table.loading"><td :colspan="branch ? 4 : 6" class="grid-status" role="status">Loading {{ branch ? 'branches' : 'banks' }}…</td></tr>
        <template v-for="row in table.loading ? [] : table.rows" :key="row.id">
          <tr class="data-row" :class="{ 'selected-row': selected?.id === row.id }" :aria-selected="selected?.id === row.id">
            <td v-if="!branch" class="expand-column"><button type="button" :disabled="busy" :aria-label="`${selected?.id === row.id ? 'Collapse' : 'Expand'} branches for ${row.name}`" :aria-expanded="selected?.id === row.id" @click="emit('toggle', row)"><ChevronDown v-if="selected?.id === row.id" :size="13" /><ChevronRight v-else :size="13" /></button></td>
            <td><button type="button" :disabled="busy" class="row-name" :aria-label="`Select ${label} ${row.name}`" @click="emit('select', row)">{{ row.name }}</button></td><td>{{ row.contactPerson }}</td><td>{{ row.contactNo }}</td><td>{{ row.email }}</td><td v-if="!branch">{{ row.bankCode }}</td>
          </tr>
          <tr v-if="!branch && selected?.id === row.id" class="detail-row"><td colspan="6"><div class="detail-container"><slot name="branches" :bank="row" /></div></td></tr>
        </template>
        <tr v-if="!table.loading && !table.rows.length"><td :colspan="branch ? 4 : 6" class="grid-status">{{ table.error ? 'Unable to load records. Try Refresh.' : `No ${branch ? 'branches' : 'banks'} found. Add one or try a different search.` }}</td></tr>
      </tbody>
    </table></div>
    <footer class="grid-footer"><nav :aria-label="`${branch ? 'Branch' : 'Bank'} pagination`" class="grid-pagination"><button :disabled="busy || table.loading || table.page <= 1" aria-label="First page" @click="emit('paginate', 1 - table.page)"><ChevronsLeft :size="14" /></button><button :disabled="busy || table.loading || table.page <= 1" aria-label="Previous page" @click="emit('paginate', -1)"><ChevronLeft :size="14" /></button><span aria-current="page">{{ table.page }}</span><button :disabled="busy || table.loading || table.page >= table.pages" aria-label="Next page" @click="emit('paginate', 1)"><ChevronRight :size="14" /></button><button :disabled="busy || table.loading || table.page >= table.pages" aria-label="Last page" @click="emit('paginate', table.pages - table.page)"><ChevronsRight :size="14" /></button></nav><span>{{ table.page }} of {{ Math.max(1, table.pages) }} pages ({{ table.total }} items)</span></footer>
  </section>
</template>
<style scoped>
.directory-grid { border: 1px solid #ccc; background: #fff; color: #303030; font-family: Arial, sans-serif; font-size: 13px; }
.grid-toolbar { min-height: 43px; display: flex; align-items: center; flex-wrap: wrap; gap: 3px; padding: 5px 8px; border-bottom: 1px solid #ccc; background: #ececec; }
.grid-toolbar button { display: inline-flex; width: 32px; height: 29px; align-items: center; justify-content: center; color: #666; border: 1px solid transparent; }
.grid-toolbar button:hover:not(:disabled) { border-color: #c3c3c3; background: #ddd; }
button:disabled { opacity: .35; cursor: not-allowed; }
button:focus-visible, input:focus-visible { outline: 2px solid #159bd0; outline-offset: -2px; }
.toolbar-divider { height: 21px; width: 1px; background: #ccc; margin: 0 9px; }
.grid-search { display: flex; align-items: center; gap: 1px; }
.grid-search input { width: 166px; height: 29px; border: 1px solid #c8c8c8; border-radius: 0; background: #fff; padding: 0 7px; }
.grid-scroll { overflow-x: auto; }
table { width: 100%; min-width: 870px; border-collapse: collapse; table-layout: fixed; }
th { background: #fbfbfb; font-size: 14px; font-weight: 600; text-align: left; height: 45px; }
th, td { border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 9px 10px; overflow-wrap: anywhere; }
th:last-child, td:last-child { border-right: 0; }
.expand-column { width: 7.5%; padding-left: 12px; }
.expand-column button { display: flex; align-items: center; min-height: 20px; width: 25px; color: #666; }
.data-row { background: white; }
.data-row:nth-of-type(even) { background: #f6f6f6; }
.data-row:hover, .selected-row { background: #f1f7fa; }
.row-name { display: block; text-align: left; width: 100%; font: inherit; color: inherit; }
.detail-row > td { padding: 4px 7px 6px 0; background: white; }
.detail-container { margin-left: 7.5%; }
.branch-table { min-width: 700px; }
.grid-status { text-align: center; padding: 32px; color: #777; }
.grid-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 10px 8px; background: #ececec; min-height: 55px; }
.grid-pagination { display: flex; align-items: center; border: 1px solid #c8c8c8; border-radius: 4px; overflow: hidden; }
.grid-pagination button, .grid-pagination span { width: 28px; height: 29px; display: flex; align-items: center; justify-content: center; color: #777; }
.grid-pagination span { background: #119ed0; color: white; }
.grid-pagination button:hover:not(:disabled) { background: #ddd; }
:global(.dark) .directory-grid { background: #172321; color: #ddd; border-color: #43504d; }
:global(.dark) .grid-toolbar, :global(.dark) .grid-footer { background: #25322f; border-color: #43504d; }
:global(.dark) th, :global(.dark) td { border-color: #43504d; }
:global(.dark) th { background: #1b2926; }
:global(.dark) .data-row, :global(.dark) .detail-row > td { background: #172321; }
:global(.dark) .data-row:nth-of-type(even) { background: #1e2c29; }
:global(.dark) .selected-row, :global(.dark) .data-row:hover { background: #29413b; }
:global(.dark) .grid-search input { background: #172321; border-color: #52605b; }
:global(.dark) .grid-toolbar button { color: #b8c3bf; }
</style>
