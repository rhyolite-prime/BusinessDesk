<script setup lang="ts">
import { ArrowDownRight, ArrowRight, ArrowUpRight, Banknote, BookOpenCheck, Building2, CalendarDays, CircleDollarSign, Download, Plus, RefreshCw, WalletCards } from '@lucide/vue'
import type { DashboardResponse } from '../../features/ledger/types'
import { useLedgerApi } from '../../features/ledger/useLedgerApi'

definePageMeta({ layout: 'admin-ledger' })

const api = useLedgerApi()
const { data, pending, error, refresh } = await useAsyncData<DashboardResponse>('ledger-dashboard', () => api.dashboard())
const metricIcons = {
  assets: Building2,
  liabilities: WalletCards,
  revenue: CircleDollarSign,
  expenditure: Banknote,
}
const metricTints: Record<string, string> = {
  assets: 'bg-[#e9f4ef] text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
  liabilities: 'bg-[#fff2e8] text-[#bd6b2f] dark:bg-orange-900/25 dark:text-orange-300',
  revenue: 'bg-[#edf1ff] text-[#566bc3] dark:bg-indigo-900/25 dark:text-indigo-300',
  expenditure: 'bg-[#f4effa] text-[#865bab] dark:bg-purple-900/25 dark:text-purple-300',
}

const recentJournals = computed(() => data.value?.recentJournals ?? [])
const asOfText = computed(() => data.value?.asOf ? formatDate(data.value.asOf) : '—')

function statusClass(status: string) {
  if (status === 'Posted') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-900/25 dark:text-emerald-300 dark:ring-emerald-400/20'
  if (status === 'Pending approval') return 'bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-900/25 dark:text-amber-300 dark:ring-amber-400/20'
  if (status === 'Approved') return 'bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-900/25 dark:text-blue-300 dark:ring-blue-400/20'
  if (status === 'Reversed') return 'bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20'
  return 'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-900/25 dark:text-violet-300 dark:ring-violet-400/20'
}
</script>

<template>
  <div class="space-y-7">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
          <span class="flex h-5 w-5 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"><Building2 :size="12" /></span>
          {{ data?.accountingUnit.name ?? 'General Ledger' }}
          <span class="text-slate-300">·</span>
          <span>{{ data?.accountingUnit.code ?? '—' }}</span>
        </div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Financial overview</h1>
        <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">A clear view of your accounting position and activity.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" @click="refresh()">
          <RefreshCw :size="14" :class="pending ? 'animate-spin' : ''" />
          Refresh
        </button>
        <button class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
          <Download :size="14" />
          Export
        </button>
        <NuxtLink to="/ledger/journals" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 transition hover:bg-brand-800">
          <Plus :size="15" />
          New journal
        </NuxtLink>
      </div>
    </section>

    <div v-if="error" class="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
      <div><p class="font-semibold">Dashboard data is unavailable</p><p class="mt-1 text-xs opacity-80">Check the ledger API connection and try again.</p></div>
      <button class="text-xs font-semibold underline underline-offset-2" @click="refresh()">Retry</button>
    </div>

    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article v-for="metric in data?.metrics ?? []" :key="metric.key" class="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ metric.label }}</p>
            <p class="mt-3 text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">{{ formatCurrency(metric.amount, metric.currency) }}</p>
          </div>
          <span class="flex h-9 w-9 items-center justify-center rounded-lg" :class="metricTints[metric.key] ?? 'bg-slate-100 text-slate-600'">
            <component :is="metricIcons[metric.key as keyof typeof metricIcons] ?? CircleDollarSign" :size="17" />
          </span>
        </div>
        <div class="mt-4 flex items-center justify-between gap-2">
          <span class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold" :class="metric.direction === 'up' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300' : metric.direction === 'down' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'">
            <ArrowUpRight v-if="metric.direction === 'up'" :size="12" />
            <ArrowDownRight v-else-if="metric.direction === 'down'" :size="12" />
            {{ metric.changeLabel }}
          </span>
          <span class="truncate text-[10px] text-slate-400">{{ metric.note }}</span>
        </div>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <article class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
        <div class="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Cash position</h2>
            <p class="mt-1 text-[11px] text-slate-400">Across active cash and bank accounts</p>
          </div>
          <div class="flex items-center gap-2 text-[11px] text-slate-400"><CalendarDays :size="14" /> As of {{ asOfText }}</div>
        </div>
        <div class="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-slate-800">
          <div v-for="cash in data?.cashPosition ?? []" :key="cash.label" class="px-5 py-5">
            <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">{{ cash.label }}</p>
            <p class="mt-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{{ formatCurrency(cash.amount, cash.currency) }}</p>
            <p class="mt-1 text-[10px] text-emerald-700 dark:text-emerald-300">{{ cash.change }}</p>
          </div>
        </div>
        <div class="border-t border-slate-100 px-5 pb-5 pt-4 dark:border-slate-800">
          <div class="mb-3 flex items-center justify-between">
            <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Cash movement · last 6 months</p>
            <span class="rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">Illustrative trend</span>
          </div>
          <div class="relative h-[104px] overflow-hidden rounded-lg bg-gradient-to-b from-brand-50/70 to-white dark:from-brand-900/15 dark:to-[#15201e]">
            <div class="absolute inset-x-0 top-1/4 border-t border-dashed border-slate-200 dark:border-slate-700" />
            <div class="absolute inset-x-0 top-2/4 border-t border-dashed border-slate-200 dark:border-slate-700" />
            <div class="absolute inset-x-0 top-3/4 border-t border-dashed border-slate-200 dark:border-slate-700" />
            <svg viewBox="0 0 800 120" preserveAspectRatio="none" class="absolute inset-0 h-full w-full">
              <defs><linearGradient id="cash-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#2f8d79" stop-opacity=".18" /><stop offset="100%" stop-color="#2f8d79" stop-opacity="0" /></linearGradient></defs>
              <path d="M0 87 C50 82 65 65 120 70 S190 92 245 63 S320 70 365 50 S425 58 478 47 S545 68 590 40 S650 42 690 27 S755 37 800 15 L800 120 L0 120 Z" fill="url(#cash-area)" />
              <path d="M0 87 C50 82 65 65 120 70 S190 92 245 63 S320 70 365 50 S425 58 478 47 S545 68 590 40 S650 42 690 27 S755 37 800 15" fill="none" stroke="#2f8d79" stroke-width="3" vector-effect="non-scaling-stroke" />
            </svg>
            <div class="absolute inset-x-0 bottom-1 flex justify-between px-3 text-[9px] text-slate-400"><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span></div>
          </div>
        </div>
      </article>

      <article class="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
        <div class="flex items-start justify-between">
          <div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Period close checklist</h2><p class="mt-1 text-[11px] text-slate-400">April 2026 · Period 202604</p></div>
          <span class="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/25 dark:text-amber-300">In progress</span>
        </div>
        <div class="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full w-[68%] rounded-full bg-brand-600" /></div>
        <p class="mt-2 text-[11px] text-slate-500 dark:text-slate-400"><span class="font-semibold text-slate-800 dark:text-slate-100">4 of 6</span> close tasks complete</p>
        <div class="mt-5 space-y-3.5">
          <div class="flex items-center gap-3 text-xs"><span class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">✓</span><span class="flex-1 text-slate-600 dark:text-slate-300">Review journal batches</span><span class="text-[10px] text-slate-400">Done</span></div>
          <div class="flex items-center gap-3 text-xs"><span class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">✓</span><span class="flex-1 text-slate-600 dark:text-slate-300">Reconcile bank accounts</span><span class="text-[10px] text-slate-400">Done</span></div>
          <div class="flex items-center gap-3 text-xs"><span class="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">!</span><span class="flex-1 text-slate-600 dark:text-slate-300">Approve pending journals</span><span class="text-[10px] font-medium text-amber-600 dark:text-amber-300">2 pending</span></div>
          <div class="flex items-center gap-3 text-xs"><span class="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-slate-400 dark:border-slate-700">4</span><span class="flex-1 text-slate-500 dark:text-slate-400">Review FX revaluation</span><span class="text-[10px] text-slate-400">Next</span></div>
        </div>
        <NuxtLink to="/ledger/reports" class="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-brand-700 hover:text-brand-800 dark:border-slate-800 dark:text-brand-300">
          View close details <ArrowRight :size="14" />
        </NuxtLink>
      </article>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Recent journal activity</h2><p class="mt-1 text-[11px] text-slate-400">Latest entries across this accounting unit</p></div>
        <NuxtLink to="/ledger/journals" class="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300">View all <ArrowRight :size="14" /></NuxtLink>
      </div>
      <div v-if="pending" class="space-y-3 p-5"><div v-for="n in 4" :key="n" class="h-9 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" /></div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[750px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50">
            <tr><th class="px-5 py-3">Batch</th><th class="px-4 py-3">Description</th><th class="px-4 py-3">Date</th><th class="px-4 py-3">Debit</th><th class="px-4 py-3">Credit</th><th class="px-4 py-3">Status</th></tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="journal in recentJournals" :key="journal.id" class="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
              <td class="px-5 py-3.5"><span class="font-mono text-[11px] font-semibold text-brand-700 dark:text-brand-300">{{ journal.batchNumber }}</span><span class="mt-1 block text-[10px] text-slate-400">{{ journal.source }}</span></td>
              <td class="max-w-[240px] truncate px-4 py-3.5 text-xs font-medium text-slate-700 dark:text-slate-200">{{ journal.description }}</td>
              <td class="px-4 py-3.5 text-xs text-slate-500">{{ formatDate(journal.date) }}</td>
              <td class="px-4 py-3.5 text-xs tabular-nums text-slate-600 dark:text-slate-300">{{ formatCurrency(journal.debit, 'GHS') }}</td>
              <td class="px-4 py-3.5 text-xs tabular-nums text-slate-600 dark:text-slate-300">{{ formatCurrency(journal.credit, 'GHS') }}</td>
              <td class="px-4 py-3.5"><span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset" :class="statusClass(journal.status)">{{ journal.status }}</span></td>
            </tr>
            <tr v-if="!recentJournals.length"><td colspan="6" class="px-5 py-10 text-center text-xs text-slate-400">No journal activity for this accounting unit yet.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-800">
        <span>Data as of {{ asOfText }}</span>
        <span class="inline-flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Double-entry status enabled</span>
      </div>
    </section>
  </div>
</template>
