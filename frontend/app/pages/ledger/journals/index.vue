<script setup lang="ts">
import { Download, Plus, Search, SlidersHorizontal, ChevronDown, CheckCheck, Clock3, FilePenLine, ListFilter } from '@lucide/vue'
import type { JournalsResponse } from '../../../features/ledger/types'
import { useLedgerApi } from '../../../features/ledger/useLedgerApi'

definePageMeta({ layout: 'admin-ledger' })

const api = useLedgerApi()
const search = ref('')
const statusFilter = ref('')
const { data, pending, error, refresh } = await useAsyncData<JournalsResponse>(
  'ledger-journals',
  () => api.journals({ search: search.value, status: statusFilter.value }),
  { watch: [search, statusFilter] },
)
const journals = computed(() => data.value?.items ?? [])
const expandedJournalId = ref('')
const pendingCount = computed(() => journals.value.filter((journal) => journal.status === 'Pending approval').length)
const draftCount = computed(() => journals.value.filter((journal) => journal.status === 'Draft').length)
const postedCount = computed(() => journals.value.filter((journal) => journal.status === 'Posted').length)

function statusClass(status: string) {
  if (status === 'Posted') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300'
  if (status === 'Pending approval') return 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300'
  if (status === 'Approved') return 'bg-blue-50 text-blue-700 dark:bg-blue-900/25 dark:text-blue-300'
  if (status === 'Reversed') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  return 'bg-violet-50 text-violet-700 dark:bg-violet-900/25 dark:text-violet-300'
}

function toggleDetails(id: string) {
  expandedJournalId.value = expandedJournalId.value === id ? '' : id
}
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Transactions</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Journal entries</h1>
        <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Prepare, review, and track journal batches through the ledger workflow.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"><Download :size="14" /> Export</button>
        <NuxtLink to="/ledger/journals/new" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800"><Plus :size="15" /> New journal</NuxtLink>
      </div>
    </section>

    <div v-if="error" class="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"><span>Journal entries could not be loaded.</span><button class="font-semibold underline" @click="refresh()">Retry</button></div>

    <section class="grid gap-3 sm:grid-cols-3">
      <div class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-900/25 dark:text-violet-300"><FilePenLine :size="18" /></span><span><span class="block text-[11px] text-slate-500">Drafts in view</span><span class="mt-1 block text-xl font-semibold text-slate-900 dark:text-white">{{ draftCount }}</span></span></div>
      <div class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300"><Clock3 :size="18" /></span><span><span class="block text-[11px] text-slate-500">Awaiting approval in view</span><span class="mt-1 block text-xl font-semibold text-slate-900 dark:text-white">{{ pendingCount }}</span></span></div>
      <div class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300"><CheckCheck :size="18" /></span><span><span class="block text-[11px] text-slate-500">Posted in view</span><span class="mt-1 block text-xl font-semibold text-slate-900 dark:text-white">{{ postedCount }}</span></span></div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800">
        <div class="relative w-full sm:max-w-[340px]"><Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="search" type="search" placeholder="Search batch, description, preparer…" class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" /></div>
        <div class="flex items-center gap-2">
          <label class="relative"><SlidersHorizontal :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><select v-model="statusFilter" class="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><option value="">All statuses</option><option value="draft">Draft</option><option value="pending">Pending approval</option><option value="approved">Approved</option><option value="posted">Posted</option><option value="reversed">Reversed</option></select><ChevronDown :size="13" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" /></label>
          <button class="hidden h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:inline-flex dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><ListFilter :size="14" /> Filters</button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1120px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="px-5 py-3">Batch number</th><th class="px-4 py-3">Description</th><th class="px-4 py-3">Date</th><th class="px-4 py-3">Source</th><th class="px-4 py-3">Organizational unit</th><th class="px-4 py-3">Preparer</th><th class="px-4 py-3 text-right">Debit / credit</th><th class="px-4 py-3">Status</th><th class="w-8 px-4 py-3" /></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-if="pending"><td colspan="9" class="px-5 py-12 text-center text-xs text-slate-400">Loading journal batches…</td></tr>
            <template v-for="journal in journals" :key="journal.id">
            <tr class="group transition hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
              <td class="px-5 py-4 font-mono text-[11px] font-semibold text-brand-700 dark:text-brand-300">{{ journal.batchNumber }}</td>
              <td class="max-w-[250px] px-4 py-4"><span class="block truncate text-xs font-medium text-slate-800 dark:text-slate-200">{{ journal.description }}</span><span class="mt-1 block text-[10px] text-slate-400">{{ journal.lineCount ? `${journal.lineCount} lines · ` : '' }}{{ journal.isMultiCurrency ? 'Multi-currency · ' : '' }}{{ journal.id }}</span></td>
              <td class="px-4 py-4 text-xs text-slate-500">{{ formatDate(journal.date) }}</td>
              <td class="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">{{ journal.source }}</td>
              <td class="max-w-[180px] px-4 py-4 text-xs text-slate-500 dark:text-slate-400"><span class="block truncate">{{ journal.organizationUnitName || '—' }}</span></td>
              <td class="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">{{ journal.preparer }}</td>
              <td class="px-4 py-4 text-right"><span class="block text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300">{{ formatCurrency(journal.debit, 'GHS') }}</span><span class="mt-1 block text-[10px] tabular-nums text-slate-400">{{ formatCurrency(journal.credit, 'GHS') }}</span></td>
              <td class="px-4 py-4"><span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="statusClass(journal.status)">{{ journal.status }}</span></td>
              <td class="px-4 py-4 text-right"><button type="button" class="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-brand-700 dark:hover:bg-slate-800 dark:hover:text-brand-300" :aria-label="`${expandedJournalId === journal.id ? 'Hide' : 'View'} details for ${journal.batchNumber}`" :aria-expanded="expandedJournalId === journal.id" @click="toggleDetails(journal.id)"><ChevronDown :size="15" class="transition-transform" :class="expandedJournalId === journal.id ? 'rotate-180 text-brand-600' : ''" /></button></td>
            </tr>
            <tr v-if="expandedJournalId === journal.id" class="bg-slate-50/60 dark:bg-slate-900/30">
              <td colspan="9" class="px-5 py-4">
                <div v-if="journal.lines?.length" class="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#15201e]">
                  <table :class="['w-full text-left text-xs', journal.isMultiCurrency ? 'min-w-[1500px]' : 'min-w-[1000px]']">
                    <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-slate-900/60"><tr><th class="px-3 py-2.5">Reference</th><th class="px-3 py-2.5">Account</th><th class="px-3 py-2.5">Description</th><th class="px-3 py-2.5">Organizational unit</th><th class="px-3 py-2.5">Transaction date</th><th class="px-3 py-2.5">Cheque no.</th><th v-if="journal.isMultiCurrency" class="px-3 py-2.5">Currency</th><th v-if="journal.isMultiCurrency" class="px-3 py-2.5 text-right">Rate to GHS</th><th v-if="journal.isMultiCurrency" class="px-3 py-2.5 text-right">Txn debit</th><th v-if="journal.isMultiCurrency" class="px-3 py-2.5 text-right">Txn credit</th><th class="px-3 py-2.5 text-right">Debit · GHS</th><th class="px-3 py-2.5 text-right">Credit · GHS</th></tr></thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="(line, index) in journal.lines" :key="line.id || `${journal.id}-line-${index}`"><td class="px-3 py-3 font-mono text-[10px] text-slate-500">{{ line.referenceNumber || '—' }}</td><td class="px-3 py-3 text-slate-700 dark:text-slate-300">{{ line.accountNumber ? `${line.accountNumber} — ` : '' }}{{ line.accountName || line.accountId }}</td><td class="px-3 py-3 text-slate-500">{{ line.description || '—' }}</td><td class="px-3 py-3 text-slate-500">{{ line.organizationUnitName || '—' }}</td><td class="px-3 py-3 text-slate-500">{{ formatDate(line.transactionDate || journal.date) }}</td><td class="px-3 py-3 text-slate-500">{{ line.chequeNumber || '—' }}</td><td v-if="journal.isMultiCurrency" class="px-3 py-3 text-slate-600 dark:text-slate-300">{{ line.currencyCode || 'GHS' }}</td><td v-if="journal.isMultiCurrency" class="px-3 py-3 text-right tabular-nums text-slate-500">{{ line.exchangeRate || '1.0000000000' }}</td><td v-if="journal.isMultiCurrency" class="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{{ line.foreignDebit && line.foreignDebit !== '0.000000' ? formatCurrency(line.foreignDebit, line.currencyCode || 'GHS') : '—' }}</td><td v-if="journal.isMultiCurrency" class="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{{ line.foreignCredit && line.foreignCredit !== '0.000000' ? formatCurrency(line.foreignCredit, line.currencyCode || 'GHS') : '—' }}</td><td class="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{{ line.debit === '0' || line.debit === '0.000000' ? '—' : formatCurrency(line.debit, 'GHS') }}</td><td class="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{{ line.credit === '0' || line.credit === '0.000000' ? '—' : formatCurrency(line.credit, 'GHS') }}</td></tr></tbody>
                  </table>
                </div>
                <p v-else class="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-[#15201e] dark:text-slate-400">Line-level details are not available for this summary.</p>
              </td>
            </tr>
            </template>
            <tr v-if="!pending && !journals.length"><td colspan="9" class="px-5 py-12 text-center"><p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No journal entries match</p><p class="mt-1 text-xs text-slate-400">Adjust the filters or create a new journal batch.</p></td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-800"><span>Showing {{ journals.length }} of {{ data?.total ?? 0 }} entries</span><span>Posted entries are locked; corrections require a reversal.</span></div>
    </section>
  </div>
</template>
