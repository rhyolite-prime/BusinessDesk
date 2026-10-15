<script setup lang="ts">
import { ArrowDownToLine, Check, ChevronDown, Clock3, Eye, FilePenLine, Plus, Search, Send, ShieldCheck, Trash2, X } from '@lucide/vue'
import { formatLedgerAmount, parseLedgerAmount } from '../money'
import type { LedgerVoucher, LedgerVoucherStatus, LedgerVoucherType, LedgerVouchersResponse } from '../voucher-data'
import { voucherTypeMetadata, voucherTypeInfo } from '../voucher-data'
import { useLedgerVoucherApi } from '../useLedgerVoucherApi'

defineProps<{ history?: boolean }>()

const api = useLedgerVoucherApi()
const search = ref('')
const typeFilter = ref<'all' | LedgerVoucherType>('all')
const statusFilter = ref('')
const showCreateMenu = ref(false)
const selectedIds = ref(new Set<string>())
const selectedVoucher = ref<LedgerVoucher | null>(null)
const actionConfirmation = ref<{ action: 'submit' | 'approve' | 'post' | 'delete'; ids: string[]; label: string } | null>(null)
const actionPending = ref(false)
const actionError = ref('')
const actionSuccess = ref('')

const { data, pending, error, refresh } = await useAsyncData<LedgerVouchersResponse>(
  'ledger-voucher-register',
  () => api.list({
    search: search.value,
    type: typeFilter.value === 'all' ? '' : typeFilter.value,
    status: statusFilter.value,
  }),
  { watch: [search, typeFilter, statusFilter] },
)

const vouchers = computed(() => data.value?.items ?? [])
const selectedVouchers = computed(() => vouchers.value.filter((voucher) => selectedIds.value.has(voucher.id)))
const allVisibleSelected = computed(() => vouchers.value.length > 0 && vouchers.value.every((voucher) => selectedIds.value.has(voucher.id)))
const selectedStatus = computed(() => {
  if (!selectedVouchers.value.length) return ''
  const first = selectedVouchers.value[0]?.status
  return selectedVouchers.value.every((voucher) => voucher.status === first) ? first ?? '' : 'Mixed'
})
const summaryTotal = computed(() => sumAmount(vouchers.value.map((voucher) => voucher.totalAmount)))
const summaryNet = computed(() => sumAmount(vouchers.value.map((voucher) => voucher.netAmount)))
const pendingCount = computed(() => vouchers.value.filter((voucher) => voucher.status === 'Pending approval').length)

watch([search, typeFilter, statusFilter], () => {
  selectedIds.value = new Set()
})

function sumAmount(values: string[]) {
  let total = BigInt(0)
  for (const value of values) total += parseLedgerAmount(value, true) ?? BigInt(0)
  return formatLedgerAmount(total)
}

function statusClass(status: LedgerVoucherStatus) {
  if (status === 'Posted') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300'
  if (status === 'Approved') return 'bg-blue-50 text-blue-700 dark:bg-blue-900/25 dark:text-blue-300'
  if (status === 'Pending approval') return 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300'
  if (status === 'Reversed' || status === 'Voided') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  return 'bg-violet-50 text-violet-700 dark:bg-violet-900/25 dark:text-violet-300'
}

function toggleVoucher(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function toggleVisible() {
  selectedIds.value = allVisibleSelected.value ? new Set() : new Set(vouchers.value.map((voucher) => voucher.id))
}

function requestAction(action: 'submit' | 'approve' | 'post' | 'delete', ids: string[], label: string) {
  actionError.value = ''
  actionSuccess.value = ''
  actionConfirmation.value = { action, ids, label }
}

function requestVoucherAction(voucher: LedgerVoucher, action: 'submit' | 'approve' | 'post' | 'delete') {
  const descriptions = {
    submit: 'submit for approval',
    approve: 'approve',
    post: 'post to the General Ledger',
    delete: 'delete',
  }
  requestAction(action, [voucher.id], `${descriptions[action]} ${voucher.voucherNumber}`)
}

async function executeAction() {
  if (!actionConfirmation.value || actionPending.value) return
  actionPending.value = true
  actionError.value = ''
  const { action, ids } = actionConfirmation.value
  try {
    for (const id of ids) {
      if (action === 'delete') await api.remove(id)
      else if (action === 'submit') await api.submit(id)
      else if (action === 'approve') await api.approve(id)
      else await api.post(id)
    }
    actionSuccess.value = action === 'delete' ? 'Draft voucher deleted.' : `Voucher action completed: ${action}.`
    selectedIds.value = new Set()
    selectedVoucher.value = null
    actionConfirmation.value = null
    await refresh()
  } catch (e: unknown) {
    const fetchError = e as { statusMessage?: string; data?: { statusMessage?: string } }
    actionError.value = fetchError.data?.statusMessage || fetchError.statusMessage || 'The voucher action could not be completed.'
  } finally {
    actionPending.value = false
  }
}

function proposedJournal(voucher: LedgerVoucher) {
  const lines: Array<{ account: string; description: string; debit: string; credit: string }> = []
  if (voucher.type === 'customer-receipt') {
    lines.push({ account: voucher.bankGlAccountName, description: 'Receipt to bank / cash', debit: voucher.totalAmount, credit: '0.000000' })
    for (const line of voucher.lines) {
      lines.push({ account: `${line.accountNumber} — ${line.accountName}`, description: line.description || line.referenceNumber || 'Receipt allocation', debit: '0.000000', credit: line.localAmount })
    }
  } else {
    for (const line of voucher.lines) {
      lines.push({ account: `${line.accountNumber} — ${line.accountName}`, description: line.description || line.referenceNumber || 'Payment allocation', debit: line.localAmount, credit: '0.000000' })
    }
    lines.push({ account: voucher.bankGlAccountName, description: 'Net payment from bank / cash', debit: '0.000000', credit: voucher.netAmount })
    for (const retention of voucher.retentions) {
      lines.push({ account: `${retention.accountNumber} — ${retention.accountName}`, description: retention.description, debit: '0.000000', credit: retention.amount })
    }
  }
  return lines
}

function exportCsv() {
  const header = ['Voucher no', 'Type', 'Payee', 'Entry date', 'Bank G/L', 'Mode', 'Currency', 'Total (GHS)', 'Net (GHS)', 'Status']
  const rows = vouchers.value.map((voucher) => [
    voucher.voucherNumber,
    voucherTypeInfo(voucher.type).shortLabel,
    voucher.payeeName,
    voucher.entryDate,
    voucher.bankGlAccountName,
    voucher.mode,
    voucher.currencyCode,
    voucher.totalAmount,
    voucher.netAmount,
    voucher.status,
  ])
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`
  const csv = [header, ...rows].map((row) => row.map((value) => escape(String(value))).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'general-ledger-vouchers.csv'
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> {{ history ? 'Voucher history' : 'Transactions' }}</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">{{ history ? 'Voucher history' : 'Vouchers' }}</h1>
        <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{{ history ? 'Review voucher batches and their posting status.' : 'Prepare supplier payments, employee payments, and customer receipts.' }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink v-if="history" to="/ledger/vouchers" class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"><Clock3 :size="14" /> Voucher register</NuxtLink>
        <button type="button" class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" @click="exportCsv"><ArrowDownToLine :size="14" /> Export</button>
        <button v-if="!history" type="button" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800" @click="showCreateMenu = true"><Plus :size="15" /> Create voucher</button>
      </div>
    </section>

    <div v-if="actionSuccess" class="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"><span>{{ actionSuccess }}</span><button type="button" aria-label="Dismiss" @click="actionSuccess = ''"><X :size="14" /></button></div>
    <div v-if="error" class="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"><span>Vouchers could not be loaded.</span><button type="button" class="font-semibold underline" @click="refresh()">Retry</button></div>

    <section class="grid gap-3 sm:grid-cols-3">
      <div class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/25 dark:text-brand-300"><FilePenLine :size="18" /></span><span><span class="block text-[11px] text-slate-500">Vouchers in view</span><span class="mt-1 block text-xl font-semibold text-slate-900 dark:text-white">{{ data?.total ?? 0 }}</span></span></div>
      <div class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300"><Clock3 :size="18" /></span><span><span class="block text-[11px] text-slate-500">Awaiting approval</span><span class="mt-1 block text-xl font-semibold text-slate-900 dark:text-white">{{ pendingCount }}</span></span></div>
      <div class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300"><Check :size="18" /></span><span><span class="block text-[11px] text-slate-500">Net value in view · GHS</span><span class="mt-1 block text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{{ formatCurrency(summaryNet, 'GHS') }}</span></span></div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="border-b border-slate-100 p-4 dark:border-slate-800 sm:px-5">
        <div class="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div class="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900/70">
            <button type="button" class="rounded-md px-3 py-2 text-[11px] font-semibold transition" :class="typeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'" @click="typeFilter = 'all'">All vouchers</button>
            <button v-for="type in voucherTypeMetadata" :key="type.value" type="button" class="rounded-md px-3 py-2 text-[11px] font-semibold transition" :class="typeFilter === type.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'" @click="typeFilter = type.value">{{ type.shortLabel }}</button>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label class="relative w-full sm:w-[290px]"><Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="search" type="search" placeholder="Search voucher, payee, invoice…" class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" /></label>
            <label class="relative"><select v-model="statusFilter" class="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><option value="">All statuses</option><option value="draft">Draft</option><option value="pending approval">Pending approval</option><option value="approved">Approved</option><option value="posted">Posted</option><option value="reversed">Reversed</option><option value="voided">Voided</option></select><ChevronDown :size="13" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" /></label>
          </div>
        </div>
        <div v-if="!history && selectedIds.size" class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 bg-brand-50/70 px-3 py-2 dark:border-brand-900/40 dark:bg-brand-950/20">
          <span class="text-[11px] font-semibold text-brand-800 dark:text-brand-200">{{ selectedIds.size }} voucher{{ selectedIds.size === 1 ? '' : 's' }} selected</span>
          <div class="flex flex-wrap gap-2">
            <button v-if="selectedStatus === 'Draft'" type="button" class="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand-700 px-3 text-[10px] font-semibold text-white hover:bg-brand-800" @click="requestAction('submit', [...selectedIds], 'submit selected drafts for approval')"><Send :size="12" /> Submit for approval</button>
            <button v-if="selectedStatus === 'Pending approval'" type="button" class="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-700 px-3 text-[10px] font-semibold text-white hover:bg-blue-800" @click="requestAction('approve', [...selectedIds], 'approve selected vouchers')"><ShieldCheck :size="12" /> Approve</button>
            <button v-if="selectedStatus === 'Approved'" type="button" class="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-700 px-3 text-[10px] font-semibold text-white hover:bg-emerald-800" @click="requestAction('post', [...selectedIds], 'post selected vouchers to the General Ledger')"><Check :size="12" /> Post</button>
            <button v-if="selectedStatus === 'Draft'" type="button" class="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-200 px-3 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30" @click="requestAction('delete', [...selectedIds], 'delete selected draft vouchers')"><Trash2 :size="12" /> Delete drafts</button>
            <button type="button" class="rounded-md px-2 text-[10px] font-semibold text-slate-500 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-800" @click="selectedIds = new Set()">Clear selection</button>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[1120px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th v-if="!history" class="w-10 px-4 py-3"><input type="checkbox" :checked="allVisibleSelected" aria-label="Select all visible vouchers" class="rounded border-slate-300 text-brand-700 focus:ring-brand-500" @change="toggleVisible" /></th><th class="px-4 py-3">Voucher number</th><th class="px-4 py-3">Payee / description</th><th class="px-4 py-3">Entry date</th><th class="px-4 py-3">Bank / cash G/L</th><th class="px-4 py-3">Mode</th><th class="px-4 py-3 text-right">Total · GHS</th><th class="px-4 py-3 text-right">Net · GHS</th><th class="px-4 py-3">Status</th><th class="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-if="pending"><td :colspan="history ? 9 : 10" class="px-5 py-12 text-center text-xs text-slate-400">Loading voucher batches…</td></tr>
            <tr v-for="voucher in vouchers" :key="voucher.id" class="group transition hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
              <td v-if="!history" class="px-4 py-4"><input type="checkbox" :checked="selectedIds.has(voucher.id)" :aria-label="`Select ${voucher.voucherNumber}`" class="rounded border-slate-300 text-brand-700 focus:ring-brand-500" @change="toggleVoucher(voucher.id)" /></td>
              <td class="px-4 py-4"><span class="block font-mono text-[11px] font-semibold text-brand-700 dark:text-brand-300">{{ voucher.voucherNumber }}</span><span class="mt-1 block text-[10px] text-slate-400">{{ voucherTypeInfo(voucher.type).shortLabel }} · {{ voucher.batchNumber }}</span></td>
              <td class="max-w-[230px] px-4 py-4"><span class="block truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{{ voucher.payeeName }}</span><span class="mt-1 block truncate text-[10px] text-slate-400">{{ voucher.description || 'No description' }}</span></td>
              <td class="px-4 py-4 text-xs text-slate-500">{{ formatDate(voucher.entryDate) }}</td>
              <td class="max-w-[190px] px-4 py-4"><span class="block truncate text-xs text-slate-600 dark:text-slate-300">{{ voucher.bankGlAccountName }}</span><span v-if="voucher.currencyCode !== 'GHS'" class="mt-1 block text-[10px] text-slate-400">{{ voucher.currencyCode }} · rate {{ voucher.exchangeRate }}</span></td>
              <td class="px-4 py-4 text-xs text-slate-500">{{ voucher.mode }}</td>
              <td class="px-4 py-4 text-right text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300">{{ formatCurrency(voucher.totalAmount, 'GHS') }}<span v-if="voucher.foreignTotal !== '0.000000'" class="mt-1 block text-[10px] text-slate-400">{{ formatCurrency(voucher.foreignTotal, voucher.currencyCode) }}</span></td>
              <td class="px-4 py-4 text-right text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{{ formatCurrency(voucher.netAmount, 'GHS') }}</td>
              <td class="px-4 py-4"><span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="statusClass(voucher.status)">{{ voucher.status }}</span></td>
              <td class="px-4 py-4"><div class="flex justify-end gap-1">
                <button type="button" class="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" :aria-label="`View ${voucher.voucherNumber}`" title="View details" @click="selectedVoucher = voucher"><Eye :size="14" /></button>
                <NuxtLink v-if="!history && voucher.status === 'Draft'" :to="`/ledger/vouchers/new/${voucher.type}?id=${encodeURIComponent(voucher.id)}`" class="rounded-md p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/30 dark:hover:text-brand-300" :aria-label="`Edit ${voucher.voucherNumber}`" title="Edit draft"><FilePenLine :size="14" /></NuxtLink>
                <button v-if="!history && voucher.status === 'Draft'" type="button" class="rounded-md p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/30 dark:hover:text-brand-300" :aria-label="`Submit ${voucher.voucherNumber}`" title="Submit for approval" @click="requestVoucherAction(voucher, 'submit')"><Send :size="14" /></button>
                <button v-if="!history && voucher.status === 'Pending approval'" type="button" class="rounded-md p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" :aria-label="`Approve ${voucher.voucherNumber}`" title="Approve" @click="requestVoucherAction(voucher, 'approve')"><ShieldCheck :size="14" /></button>
                <button v-if="!history && voucher.status === 'Approved'" type="button" class="rounded-md p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" :aria-label="`Post ${voucher.voucherNumber}`" title="Post to General Ledger" @click="requestVoucherAction(voucher, 'post')"><Check :size="14" /></button>
                <button v-if="!history && voucher.status === 'Draft'" type="button" class="rounded-md p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" :aria-label="`Delete ${voucher.voucherNumber}`" title="Delete draft" @click="requestVoucherAction(voucher, 'delete')"><Trash2 :size="14" /></button>
              </div></td>
            </tr>
            <tr v-if="!pending && !vouchers.length"><td :colspan="history ? 9 : 10" class="px-5 py-12 text-center"><p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No vouchers match</p><p class="mt-1 text-xs text-slate-400">Adjust the filters or create a new voucher.</p></td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-col gap-1 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><span>Showing {{ vouchers.length }} of {{ data?.total ?? 0 }} vouchers · Total amount {{ formatCurrency(summaryTotal, 'GHS') }}</span><span>Only approved vouchers can be posted; posted batches are immutable.</span></div>
    </section>

    <div v-if="showCreateMenu" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" @click.self="showCreateMenu = false">
      <section class="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#15201e] sm:p-6">
        <div class="flex items-start justify-between gap-4"><div><h2 class="text-base font-semibold text-slate-900 dark:text-white">Create a voucher</h2><p class="mt-1 text-xs text-slate-500">Choose the transaction workflow to start.</p></div><button type="button" class="rounded-md p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close" @click="showCreateMenu = false"><X :size="16" /></button></div>
        <div class="mt-5 space-y-2">
          <NuxtLink v-for="type in voucherTypeMetadata" :key="type.value" :to="`/ledger/vouchers/new/${type.value}`" class="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-800 dark:hover:border-brand-800 dark:hover:bg-brand-950/20" @click="showCreateMenu = false"><span><span class="block text-sm font-semibold text-slate-900 dark:text-white">{{ type.label }}</span><span class="mt-1 block text-xs text-slate-500">{{ type.description }}</span></span><span class="shrink-0 text-brand-700 dark:text-brand-300"><Plus :size="16" /></span></NuxtLink>
        </div>
      </section>
    </div>

    <div v-if="selectedVoucher" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" @click.self="selectedVoucher = null">
      <section class="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#15201e]">
        <div class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur dark:border-slate-800 dark:bg-[#15201e]/95 sm:px-6"><div><p class="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400">{{ voucherTypeInfo(selectedVoucher.type).label }}</p><h2 class="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{{ selectedVoucher.voucherNumber }}</h2><p class="mt-1 text-xs text-slate-500">Batch {{ selectedVoucher.batchNumber }} · {{ selectedVoucher.status }}</p></div><button type="button" class="rounded-md p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close details" @click="selectedVoucher = null"><X :size="16" /></button></div>
        <div class="space-y-5 p-5 sm:p-6">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Payee / customer</span><span class="mt-1 block text-xs font-semibold text-slate-800 dark:text-slate-200">{{ selectedVoucher.payeeName }}</span></div>
            <div><span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Entry date</span><span class="mt-1 block text-xs text-slate-700 dark:text-slate-300">{{ formatDate(selectedVoucher.entryDate) }}</span></div>
            <div><span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Payment / receipt date</span><span class="mt-1 block text-xs text-slate-700 dark:text-slate-300">{{ formatDate(selectedVoucher.paymentDate || selectedVoucher.receiptDate || '') }}</span></div>
            <div><span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Bank / cash G/L</span><span class="mt-1 block text-xs text-slate-700 dark:text-slate-300">{{ selectedVoucher.bankGlAccountName }}</span></div>
            <div><span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Mode</span><span class="mt-1 block text-xs text-slate-700 dark:text-slate-300">{{ selectedVoucher.mode }}{{ selectedVoucher.chequeNumber ? ` · ${selectedVoucher.chequeNumber}` : '' }}</span></div>
            <div><span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Currency / rate</span><span class="mt-1 block text-xs text-slate-700 dark:text-slate-300">{{ selectedVoucher.currencyCode }} · {{ selectedVoucher.exchangeRate }}</span></div>
            <div><span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total · GHS</span><span class="mt-1 block text-xs font-semibold text-slate-800 dark:text-slate-200">{{ formatCurrency(selectedVoucher.totalAmount, 'GHS') }}</span></div>
            <div><span class="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Net · GHS</span><span class="mt-1 block text-xs font-semibold text-emerald-700 dark:text-emerald-300">{{ formatCurrency(selectedVoucher.netAmount, 'GHS') }}</span></div>
          </div>
          <div><h3 class="text-xs font-semibold text-slate-900 dark:text-white">Voucher line items</h3><div class="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800"><table class="w-full min-w-[760px] text-left text-xs"><thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-slate-900/60"><tr><th class="px-3 py-2.5">Invoice / reference</th><th class="px-3 py-2.5">G/L account</th><th class="px-3 py-2.5">Description</th><th class="px-3 py-2.5">Org unit</th><th class="px-3 py-2.5 text-right">Local amount · GHS</th><th v-if="selectedVoucher.multiCurrency" class="px-3 py-2.5 text-right">Foreign amount</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="line in selectedVoucher.lines" :key="line.id"><td class="px-3 py-3 text-slate-600 dark:text-slate-300"><span v-if="line.invoiceNumber" class="block">Inv: {{ line.invoiceNumber }}</span><span class="block text-[10px] text-slate-400">Ref: {{ line.referenceNumber || '—' }}</span></td><td class="px-3 py-3 text-slate-700 dark:text-slate-300">{{ line.accountNumber }} — {{ line.accountName }}</td><td class="px-3 py-3 text-slate-600 dark:text-slate-400">{{ line.description || '—' }}</td><td class="px-3 py-3 text-slate-600 dark:text-slate-400">{{ line.organizationUnitName || '—' }}</td><td class="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{{ formatCurrency(line.localAmount, 'GHS') }}</td><td v-if="selectedVoucher.multiCurrency" class="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{{ formatCurrency(line.foreignAmount, selectedVoucher.currencyCode) }}</td></tr></tbody></table></div></div>
          <div v-if="selectedVoucher.retentions.length"><h3 class="text-xs font-semibold text-slate-900 dark:text-white">Retentions</h3><div class="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800"><table class="w-full min-w-[520px] text-left text-xs"><thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-slate-900/60"><tr><th class="px-3 py-2.5">Retention</th><th class="px-3 py-2.5">Credit G/L</th><th class="px-3 py-2.5 text-right">Basis</th><th class="px-3 py-2.5 text-right">Amount · GHS</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="retention in selectedVoucher.retentions" :key="retention.id"><td class="px-3 py-3">{{ retention.description }}</td><td class="px-3 py-3">{{ retention.accountNumber }} — {{ retention.accountName }}</td><td class="px-3 py-3 text-right">{{ retention.value }}{{ retention.isPercentage ? '%' : ' GHS' }}</td><td class="px-3 py-3 text-right tabular-nums">{{ formatCurrency(retention.amount, 'GHS') }}</td></tr></tbody></table></div></div>
          <div><h3 class="text-xs font-semibold text-slate-900 dark:text-white">Proposed journal entry</h3><p class="mt-1 text-[10px] text-slate-500">Posting will create a balanced General Ledger batch from these lines.</p><div class="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800"><table class="w-full min-w-[620px] text-left text-xs"><thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-slate-900/60"><tr><th class="px-3 py-2.5">Account</th><th class="px-3 py-2.5">Description</th><th class="px-3 py-2.5 text-right">Debit · GHS</th><th class="px-3 py-2.5 text-right">Credit · GHS</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="(line, index) in proposedJournal(selectedVoucher)" :key="`${selectedVoucher.id}-gl-${index}`"><td class="px-3 py-3">{{ line.account }}</td><td class="px-3 py-3 text-slate-500">{{ line.description }}</td><td class="px-3 py-3 text-right tabular-nums">{{ line.debit === '0.000000' ? '—' : formatCurrency(line.debit, 'GHS') }}</td><td class="px-3 py-3 text-right tabular-nums">{{ line.credit === '0.000000' ? '—' : formatCurrency(line.credit, 'GHS') }}</td></tr></tbody><tfoot class="bg-slate-50 font-semibold dark:bg-slate-900/60"><tr><td colspan="2" class="px-3 py-2.5 text-right">Totals</td><td class="px-3 py-2.5 text-right tabular-nums">{{ formatCurrency(sumAmount(proposedJournal(selectedVoucher).map((line) => line.debit)), 'GHS') }}</td><td class="px-3 py-2.5 text-right tabular-nums">{{ formatCurrency(sumAmount(proposedJournal(selectedVoucher).map((line) => line.credit)), 'GHS') }}</td></tr></tfoot></table></div></div>
        </div>
      </section>
    </div>

    <div v-if="actionConfirmation" class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" @click.self="!actionPending && (actionConfirmation = null)">
      <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#15201e] sm:p-6"><div class="flex items-start gap-3"><span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300"><ShieldCheck :size="17" /></span><div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Confirm voucher action</h2><p class="mt-1.5 text-xs leading-5 text-slate-500">Are you sure you want to {{ actionConfirmation.label }}? The workflow status rules will be enforced.</p></div></div><p v-if="actionError" class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ actionError }}</p><div class="mt-5 flex justify-end gap-2"><button type="button" :disabled="actionPending" class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300" @click="actionConfirmation = null">Cancel</button><button type="button" :disabled="actionPending" class="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-700 px-3.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50" @click="executeAction"><span v-if="actionPending" class="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />{{ actionPending ? 'Working…' : 'Confirm' }}</button></div></section>
    </div>
  </div>
</template>
