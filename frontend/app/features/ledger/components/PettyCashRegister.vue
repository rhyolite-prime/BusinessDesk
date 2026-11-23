<script setup lang="ts">
import {
  ArrowDownToLine,
  Banknote,
  Check,
  ChevronDown,
  Clock3,
  Eye,
  FilePenLine,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from '@lucide/vue'
import { formatLedgerAmount, parseLedgerAmount } from '../money'
import { voucherRateDisplay } from '../voucher-rate-input'
import { ledgerOrganizationalUnits } from '../organization-data'
import {
  useLedgerPettyCash,
  type LedgerPettyCashBatch,
  type LedgerPettyCashStatus,
} from '../petty-cash-data'
import { useLedgerApi } from '../useLedgerApi'
import type { AccountsResponse } from '../types'

const props = defineProps<{ history?: boolean }>()
const emit = defineEmits<{
  (e: 'new-batch'): void
  (e: 'edit-batch', batch: LedgerPettyCashBatch): void
}>()

const api = useLedgerApi()
const pettyCash = useLedgerPettyCash()
const batches = pettyCash.batches

const { data: accountResponse } = await useAsyncData<AccountsResponse>(
  'ledger-petty-cash-register-accounts',
  () => api.accounts(),
  { default: () => ({ items: [], total: 0 }) },
)

const accounts = computed(() => accountResponse.value?.items ?? [])
const search = ref('')
const statusFilter = ref('')
const selectedIds = ref(new Set<string>())
const selectedBatch = ref<LedgerPettyCashBatch | null>(null)
const actionConfirmation = ref<{
  action: 'post' | 'delete'
  ids: string[]
  label: string
} | null>(null)
const actionPending = ref(false)
const actionError = ref('')
const actionSuccess = ref('')

function accountLabel(accountId: string) {
  const account = accounts.value.find((item) => item.id === accountId)
  return account ? `${account.accountNumber} — ${account.name}` : accountId ? 'Account unavailable' : 'Select an account'
}

function organizationUnitName(id: string) {
  return ledgerOrganizationalUnits.find((unit) => unit.id === id)?.name || (id ? 'Organizational unit unavailable' : 'Not assigned')
}

function batchTotalUnits(batch: LedgerPettyCashBatch): bigint {
  return batch.lines.reduce((total, line) => {
    const amount = parseLedgerAmount(line.amount)
    return amount !== null && amount > BigInt(0) ? total + amount : total
  }, BigInt(0))
}

function formatMoneyUnits(units: bigint, currencyCode = 'GHS') {
  const sign = units < 0n ? '-' : ''
  const absolute = units < 0n ? -units : units
  return formatCurrency(`${sign}${absolute / 1000000n}.${String(absolute % 1000000n).padStart(6, '0')}`, currencyCode)
}

function batchTotalText(batch: LedgerPettyCashBatch) {
  return formatMoneyUnits(batchTotalUnits(batch), batch.currencyCode)
}

function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function statusClass(status: LedgerPettyCashStatus) {
  return status === 'posted'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300'
    : 'bg-violet-50 text-violet-700 dark:bg-violet-900/25 dark:text-violet-300'
}

const visibleBatches = computed(() => {
  const query = search.value.trim().toLowerCase()
  return batches.value
    .filter((batch) => {
      if (props.history && batch.status !== 'posted') return false
      if (statusFilter.value && batch.status !== statusFilter.value) return false
      if (!query) return true
      const fields = [
        batch.batchNumber,
        batch.sourceDocumentNumber,
        batch.batchOriginator || '',
        batch.currencyCode,
        accountLabel(batch.pettyCashAccountId),
        ...batch.lines.flatMap((line) => [
          line.referenceNumber,
          line.description,
          line.recipientName,
          accountLabel(line.expenseAccountId),
        ]),
      ]
      return fields.some((value) => value.toLowerCase().includes(query))
    })
    .slice()
    .sort((a, b) => b.batchDate.localeCompare(a.batchDate) || b.batchNumber.localeCompare(a.batchNumber))
})

const selectedBatches = computed(() =>
  visibleBatches.value.filter((batch) => selectedIds.value.has(batch.id)),
)

const allVisibleSelected = computed(
  () =>
    visibleBatches.value.length > 0 &&
    visibleBatches.value.every((batch) => selectedIds.value.has(batch.id)),
)

const selectedStatus = computed(() => {
  if (!selectedBatches.value.length) return ''
  const first = selectedBatches.value[0]?.status
  return selectedBatches.value.every((b) => b.status === first) ? (first ?? '') : 'Mixed'
})

const draftCount = computed(
  () => visibleBatches.value.filter((batch) => batch.status === 'draft').length,
)

const summaryTotalUnits = computed(() =>
  visibleBatches.value.reduce((total, batch) => total + batchTotalUnits(batch), BigInt(0)),
)

const summaryCurrency = computed(() => {
  const codes = [...new Set(visibleBatches.value.map((b) => b.currencyCode))]
  return codes.length === 1 ? codes[0] || 'GHS' : ''
})

watch([search, statusFilter], () => {
  selectedIds.value = new Set()
})

function toggleBatch(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function toggleVisible() {
  selectedIds.value = allVisibleSelected.value
    ? new Set()
    : new Set(visibleBatches.value.map((batch) => batch.id))
}

function requestAction(action: 'post' | 'delete', ids: string[], label: string) {
  actionError.value = ''
  actionSuccess.value = ''
  actionConfirmation.value = { action, ids, label }
}

function requestBatchAction(batch: LedgerPettyCashBatch, action: 'post' | 'delete') {
  const descriptions = {
    post: 'post to the General Ledger',
    delete: 'delete',
  }
  requestAction(action, [batch.id], `${descriptions[action]} ${batch.batchNumber}`)
}

function executeAction() {
  if (!actionConfirmation.value || actionPending.value) return
  actionPending.value = true
  actionError.value = ''
  const { action, ids } = actionConfirmation.value

  try {
    for (const id of ids) {
      if (action === 'delete') {
        const ok = pettyCash.deleteBatch(id)
        if (!ok) throw new Error('Posted batches cannot be deleted.')
      } else {
        const ok = pettyCash.postBatch(id)
        if (!ok) throw new Error('This draft batch could not be posted.')
      }
    }
    actionSuccess.value =
      action === 'delete'
        ? `${ids.length} draft ${ids.length === 1 ? 'batch' : 'batches'} deleted.`
        : `${ids.length} petty cash ${ids.length === 1 ? 'batch' : 'batches'} posted.`
    selectedIds.value = new Set()
    if (selectedBatch.value && ids.includes(selectedBatch.value.id)) {
      if (action === 'delete') selectedBatch.value = null
      else {
        const updated = batches.value.find((b) => b.id === selectedBatch.value?.id)
        if (updated) selectedBatch.value = updated
      }
    }
    actionConfirmation.value = null
  } catch (e: unknown) {
    actionError.value = e instanceof Error ? e.message : 'The action could not be completed.'
  } finally {
    actionPending.value = false
  }
}

function proposedJournal(batch: LedgerPettyCashBatch) {
  const debits: Array<{ account: string; description: string; debit: bigint; credit: bigint }> = []
  const total = batchTotalUnits(batch)

  if (batch.journalMode === 'non-consolidated') {
    for (const line of batch.lines) {
      const amount = parseLedgerAmount(line.amount) ?? 0n
      if (amount > 0n) {
        debits.push({
          account: accountLabel(line.expenseAccountId),
          description: line.description || 'Petty cash expense',
          debit: amount,
          credit: 0n,
        })
      }
    }
  } else {
    const expenseAccountsUsed = new Set(batch.lines.map((l) => l.expenseAccountId))
    const firstAccount = batch.lines[0]?.expenseAccountId
    const display = expenseAccountsUsed.size === 1 && firstAccount
      ? accountLabel(firstAccount)
      : `Expense A/C (${expenseAccountsUsed.size} G/L accounts)`

    debits.push({
      account: display,
      description: `Consolidated petty cash expenses (${batch.lines.length} items)`,
      debit: total,
      credit: 0n,
    })
  }

  if (batch.pettyCashAccountId && total > 0n) {
    debits.push({
      account: accountLabel(batch.pettyCashAccountId),
      description: `Petty cash batch ${batch.batchNumber}`,
      debit: 0n,
      credit: total,
    })
  }

  return debits
}

function exportCsv() {
  const header = [
    'Batch number',
    'Batch date',
    'Petty cash G/L',
    'Source document',
    'Currency',
    'Exchange rate',
    'Expenses count',
    'Total amount',
    'Status',
  ]
  const rows = visibleBatches.value.map((batch) => [
    batch.batchNumber,
    batch.batchDate,
    accountLabel(batch.pettyCashAccountId),
    batch.sourceDocumentNumber || '',
    batch.currencyCode,
    voucherRateDisplay(batch.exchangeRate),
    batch.lines.length,
    formatLedgerAmount(batchTotalUnits(batch)),
    batch.status,
  ])
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [header, ...rows]
    .map((row) => row.map(escape).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'petty-cash-transactions.csv'
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">
          General Ledger <span class="mx-1 text-slate-300">/</span> {{ history ? 'Petty Cash History' : 'Transactions' }}
        </div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">
          {{ history ? 'Petty Cash History' : 'Petty Cash Transactions' }}
        </h1>
        <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {{ history ? 'Review posted petty cash batches and their ledger impact.' : 'Review petty cash expense batches, receipts, and their posting status.' }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink
          v-if="history"
          to="/ledger/petty-cash"
          class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Clock3 :size="14" /> Petty cash register
        </NuxtLink>
        <NuxtLink
          to="/ledger/petty-cash-recipients"
          class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Users :size="14" /> Manage recipients
        </NuxtLink>
        <button
          type="button"
          class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          @click="exportCsv"
        >
          <ArrowDownToLine :size="14" /> Export
        </button>
        <NuxtLink
          v-if="!history"
          to="/ledger/petty-cash/new"
          class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 transition hover:bg-brand-800"
          @click="emit('new-batch')"
        >
          <Plus :size="15" /> New batch
        </NuxtLink>
      </div>
    </section>

    <div
      v-if="actionSuccess"
      class="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
    >
      <span class="flex items-center gap-2"><Check :size="14" />{{ actionSuccess }}</span>
      <button type="button" aria-label="Dismiss" @click="actionSuccess = ''"><X :size="14" /></button>
    </div>

    <section class="grid gap-3 sm:grid-cols-3">
      <div class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/25 dark:text-brand-300">
          <Banknote :size="18" />
        </span>
        <span>
          <span class="block text-[11px] text-slate-500">Batches in view</span>
          <span class="mt-1 block text-xl font-semibold text-slate-900 dark:text-white">{{ visibleBatches.length }}</span>
        </span>
      </div>
      <div class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300">
          <Clock3 :size="18" />
        </span>
        <span>
          <span class="block text-[11px] text-slate-500">Draft batches</span>
          <span class="mt-1 block text-xl font-semibold text-slate-900 dark:text-white">{{ draftCount }}</span>
        </span>
      </div>
      <div class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300">
          <Check :size="18" />
        </span>
        <span>
          <span class="block text-[11px] text-slate-500">Total value in view · {{ summaryCurrency || 'mixed' }}</span>
          <span class="mt-1 block text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {{ formatMoneyUnits(summaryTotalUnits, summaryCurrency || 'GHS') }}
          </span>
        </span>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="border-b border-slate-100 p-4 dark:border-slate-800 sm:px-5">
        <div class="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div class="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900/70">
            <button
              type="button"
              :aria-pressed="statusFilter === ''"
              class="rounded-md px-3 py-2 text-[11px] font-semibold transition"
              :class="statusFilter === '' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
              @click="statusFilter = ''"
            >
              All batches
            </button>
            <button
              type="button"
              :aria-pressed="statusFilter === 'draft'"
              class="rounded-md px-3 py-2 text-[11px] font-semibold transition"
              :class="statusFilter === 'draft' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
              @click="statusFilter = 'draft'"
            >
              Drafts
            </button>
            <button
              type="button"
              :aria-pressed="statusFilter === 'posted'"
              class="rounded-md px-3 py-2 text-[11px] font-semibold transition"
              :class="statusFilter === 'posted' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
              @click="statusFilter = 'posted'"
            >
              Posted
            </button>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label class="relative w-full sm:w-[320px]">
              <Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                v-model="search"
                type="search"
                placeholder="Search batch, doc, expense, recipient…"
                class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30"
              />
            </label>
            <label class="relative">
              <select
                v-model="statusFilter"
                class="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="posted">Posted</option>
              </select>
              <ChevronDown :size="13" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </label>
          </div>
        </div>

        <div
          v-if="!history && selectedIds.size"
          class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 bg-brand-50/70 px-3 py-2 dark:border-brand-900/40 dark:bg-brand-950/20"
        >
          <span class="text-[11px] font-semibold text-brand-800 dark:text-brand-200">
            {{ selectedIds.size }} batch{{ selectedIds.size === 1 ? '' : 'es' }} selected
          </span>
          <div class="flex flex-wrap gap-2">
            <button
              v-if="selectedStatus === 'draft'"
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-700 px-3 text-[10px] font-semibold text-white hover:bg-emerald-800"
              @click="requestAction('post', [...selectedIds], 'post selected batches')"
            >
              <Check :size="12" /> Post
            </button>
            <button
              v-if="selectedStatus === 'draft'"
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-200 px-3 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30"
              @click="requestAction('delete', [...selectedIds], 'delete selected draft batches')"
            >
              <Trash2 :size="12" /> Delete drafts
            </button>
            <button
              type="button"
              class="rounded-md px-2 text-[10px] font-semibold text-slate-500 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-800"
              @click="selectedIds = new Set()"
            >
              Clear selection
            </button>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[1020px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50">
            <tr>
              <th v-if="!history" class="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  :checked="allVisibleSelected"
                  aria-label="Select all visible batches"
                  class="rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                  @change="toggleVisible"
                />
              </th>
              <th class="px-4 py-3">Batch number</th>
              <th class="px-4 py-3">Batch date</th>
              <th class="px-4 py-3">Source document</th>
              <th class="px-4 py-3 text-right">Expenses</th>
              <th class="px-4 py-3">Currency / Rate</th>
              <th class="px-4 py-3 text-right">Total</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="batch in visibleBatches"
              :key="batch.id"
              class="group transition hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
            >
              <td v-if="!history" class="px-4 py-4">
                <input
                  type="checkbox"
                  :checked="selectedIds.has(batch.id)"
                  :aria-label="`Select ${batch.batchNumber}`"
                  class="rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                  @change="toggleBatch(batch.id)"
                />
              </td>
              <td class="px-4 py-4">
                <span class="block font-mono text-[11px] font-semibold text-brand-700 dark:text-brand-300">{{ batch.batchNumber }}</span>
                <span class="mt-1 block text-[10px] text-slate-400">{{ accountLabel(batch.pettyCashAccountId) }}</span>
              </td>
              <td class="px-4 py-4 text-xs text-slate-500">{{ formatDate(batch.batchDate) }}</td>
              <td class="max-w-[200px] px-4 py-4">
                <span class="block truncate text-xs font-medium text-slate-700 dark:text-slate-300">{{ batch.sourceDocumentNumber || '—' }}</span>
                <span v-if="batch.batchOriginator" class="mt-1 block text-[10px] text-slate-400">Orig: {{ batch.batchOriginator }}</span>
              </td>
              <td class="px-4 py-4 text-right text-xs tabular-nums text-slate-500">{{ batch.lines.length }}</td>
              <td class="px-4 py-4 text-xs text-slate-500">
                <span class="block">{{ batch.currencyCode }}</span>
                <span class="mt-1 block text-[10px] tabular-nums text-slate-400">rate {{ voucherRateDisplay(batch.exchangeRate) }}</span>
              </td>
              <td class="px-4 py-4 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {{ batchTotalText(batch) }}
              </td>
              <td class="px-4 py-4">
                <span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="statusClass(batch.status)">
                  {{ batch.status === 'posted' ? 'Posted' : 'Draft' }}
                </span>
              </td>
              <td class="px-4 py-4">
                <div class="flex justify-end gap-1">
                  <button
                    type="button"
                    class="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                    :aria-label="`View ${batch.batchNumber}`"
                    title="View details"
                    @click="selectedBatch = batch"
                  >
                    <Eye :size="14" />
                  </button>
                  <NuxtLink
                    v-if="!history && batch.status === 'draft'"
                    :to="`/ledger/petty-cash/new?id=${encodeURIComponent(batch.id)}`"
                    class="rounded-md p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/30 dark:hover:text-brand-300"
                    :aria-label="`Edit ${batch.batchNumber}`"
                    title="Edit draft"
                    @click="emit('edit-batch', batch)"
                  >
                    <FilePenLine :size="14" />
                  </NuxtLink>
                  <button
                    v-if="!history && batch.status === 'draft'"
                    type="button"
                    class="rounded-md p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    :aria-label="`Post ${batch.batchNumber}`"
                    title="Post to General Ledger"
                    @click="requestBatchAction(batch, 'post')"
                  >
                    <ShieldCheck :size="14" />
                  </button>
                  <button
                    v-if="!history && batch.status === 'draft'"
                    type="button"
                    class="rounded-md p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                    :aria-label="`Delete ${batch.batchNumber}`"
                    title="Delete draft"
                    @click="requestBatchAction(batch, 'delete')"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!visibleBatches.length">
              <td :colspan="history ? 8 : 9" class="px-5 py-12 text-center">
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No petty cash batches match</p>
                <p class="mt-1 text-xs text-slate-400">Adjust the search filter or record a new batch.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-col gap-1 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {{ visibleBatches.length }} of {{ batches.length }} batches · Total value {{ formatMoneyUnits(summaryTotalUnits, summaryCurrency || 'GHS') }}
        </span>
        <span>Posted batches are immutable.</span>
      </div>
    </section>

    <!-- Detailed Batch View Modal -->
    <div
      v-if="selectedBatch"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      @click.self="selectedBatch = null"
    >
      <section class="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#15201e]">
        <div class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur dark:border-slate-800 dark:bg-[#15201e]/95 sm:px-6">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400">Petty Cash Batch</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{{ selectedBatch.batchNumber }}</h2>
            <p class="mt-1 text-xs text-slate-500">Date {{ formatDate(selectedBatch.batchDate) }} · {{ selectedBatch.status }}</p>
          </div>
          <button
            type="button"
            class="rounded-md p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close details"
            @click="selectedBatch = null"
          >
            <X :size="16" />
          </button>
        </div>

        <div class="space-y-5 p-5 sm:p-6">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Batch date</span>
              <span class="mt-1 block text-xs font-semibold text-slate-800 dark:text-slate-200">{{ formatDate(selectedBatch.batchDate) }}</span>
            </div>
            <div>
              <span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Petty Cash G/L</span>
              <span class="mt-1 block text-xs text-slate-700 dark:text-slate-300">{{ accountLabel(selectedBatch.pettyCashAccountId) }}</span>
            </div>
            <div>
              <span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Source document</span>
              <span class="mt-1 block text-xs text-slate-700 dark:text-slate-300">{{ selectedBatch.sourceDocumentNumber || '—' }}</span>
            </div>
            <div>
              <span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Currency / Rate (4 dp)</span>
              <span class="mt-1 block text-xs text-slate-700 dark:text-slate-300">{{ selectedBatch.currencyCode }} · {{ voucherRateDisplay(selectedBatch.exchangeRate) }}</span>
            </div>
            <div>
              <span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Presentation mode</span>
              <span class="mt-1 block text-xs capitalize text-slate-700 dark:text-slate-300">{{ selectedBatch.journalMode }}</span>
            </div>
            <div>
              <span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Batch total</span>
              <span class="mt-1 block text-xs font-semibold text-emerald-700 dark:text-emerald-300">{{ batchTotalText(selectedBatch) }}</span>
            </div>
          </div>

          <div>
            <h3 class="text-xs font-semibold text-slate-900 dark:text-white">Expense transactions</h3>
            <div class="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table class="w-full min-w-[720px] text-left text-xs">
                <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-slate-900/60">
                  <tr>
                    <th class="px-3 py-2.5">Date</th>
                    <th class="px-3 py-2.5">Reference no.</th>
                    <th class="px-3 py-2.5">Expense G/L</th>
                    <th class="px-3 py-2.5">Description</th>
                    <th class="px-3 py-2.5">Org unit</th>
                    <th class="px-3 py-2.5">Recipient</th>
                    <th class="px-3 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr v-for="line in selectedBatch.lines" :key="line.id">
                    <td class="px-3 py-3 text-slate-600 dark:text-slate-300">{{ formatDate(line.transactionDate) }}</td>
                    <td class="px-3 py-3 font-mono text-[10px] text-slate-500">{{ line.referenceNumber || '—' }}</td>
                    <td class="px-3 py-3 text-slate-700 dark:text-slate-300">{{ accountLabel(line.expenseAccountId) }}</td>
                    <td class="px-3 py-3 text-slate-600 dark:text-slate-400">{{ line.description || '—' }}</td>
                    <td class="px-3 py-3 text-slate-600 dark:text-slate-400">{{ organizationUnitName(line.organizationUnitId) }}</td>
                    <td class="px-3 py-3 text-slate-600 dark:text-slate-400">{{ line.recipientName || '—' }}</td>
                    <td class="px-3 py-3 text-right font-medium tabular-nums text-slate-800 dark:text-slate-200">
                      {{ formatCurrency(line.amount, selectedBatch.currencyCode) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 class="text-xs font-semibold text-slate-900 dark:text-white">Proposed journal entry</h3>
            <p class="mt-1 text-[10px] text-slate-500">Posting creates a balanced General Ledger batch from these lines.</p>
            <div class="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table class="w-full min-w-[620px] text-left text-xs">
                <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-slate-900/60">
                  <tr>
                    <th class="px-3 py-2.5">Account</th>
                    <th class="px-3 py-2.5">Description</th>
                    <th class="px-3 py-2.5 text-right">Debit</th>
                    <th class="px-3 py-2.5 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr v-for="(line, index) in proposedJournal(selectedBatch)" :key="index">
                    <td class="px-3 py-3 font-medium text-slate-800 dark:text-slate-200">{{ line.account }}</td>
                    <td class="px-3 py-3 text-slate-500">{{ line.description }}</td>
                    <td class="px-3 py-3 text-right tabular-nums">
                      {{ line.debit > 0n ? formatMoneyUnits(line.debit, selectedBatch.currencyCode) : '—' }}
                    </td>
                    <td class="px-3 py-3 text-right tabular-nums">
                      {{ line.credit > 0n ? formatMoneyUnits(line.credit, selectedBatch.currencyCode) : '—' }}
                    </td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-50 font-semibold dark:bg-slate-900/60">
                  <tr>
                    <td colspan="2" class="px-3 py-2.5 text-right">Totals</td>
                    <td class="px-3 py-2.5 text-right tabular-nums">{{ batchTotalText(selectedBatch) }}</td>
                    <td class="px-3 py-2.5 text-right tabular-nums">{{ batchTotalText(selectedBatch) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Action Confirmation Dialog -->
    <div
      v-if="actionConfirmation"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
      @click.self="!actionPending && (actionConfirmation = null)"
    >
      <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#15201e] sm:p-6">
        <div class="flex items-start gap-3">
          <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300">
            <ShieldCheck :size="17" />
          </span>
          <div>
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Confirm petty cash action</h2>
            <p class="mt-1.5 text-xs leading-5 text-slate-500">
              Are you sure you want to {{ actionConfirmation.label }}?
            </p>
          </div>
        </div>
        <p v-if="actionError" class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          {{ actionError }}
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            :disabled="actionPending"
            class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
            @click="actionConfirmation = null"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="actionPending"
            class="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-700 px-3.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
            @click="executeAction"
          >
            <span v-if="actionPending" class="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            {{ actionPending ? 'Working…' : 'Confirm' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
