<script setup lang="ts">
import {
  Activity,
  ArrowRight,
  Banknote,
  BookOpenCheck,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  Clock,
  LayoutGrid,
  ListTree,
  Plus,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  ShieldCheck,
  WalletCards,
} from '@lucide/vue'
import type { Component } from 'vue'
import type { EChartsOption } from 'echarts'
import { dashboardSourceLabel, dashboardStatuses } from '../../features/ledger/dashboard-filters'
import { useLedgerDashboard } from '../../features/ledger/useLedgerDashboard'

definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Dashboard' })

interface DashboardCard {
  key: string
  label: string
  value: string
  detail: string
  icon: Component
  tone: 'green' | 'amber' | 'blue' | 'purple' | 'teal' | 'slate'
}

const { filters, datePreset, options, costCenters, data, pending, optionsPending, optionsError, error, validation, refresh, refreshOptions, applyDatePreset, resetFilters } = useLedgerDashboard()

const recentJournals = computed(() => data.value?.recentJournals ?? [])
const pendingJournals = computed(() => data.value?.pendingJournals ?? [])
const asOfText = computed(() => data.value?.asOf ? formatDate(new Date(data.value.asOf), { hour: '2-digit', minute: '2-digit' }) : '—')
const balanceAsOfText = computed(() => data.value ? formatDate(data.value.filters.dateTo) : '—')
const periodText = computed(() => data.value ? `${formatDate(data.value.filters.dateFrom)} – ${formatDate(data.value.filters.dateTo)}` : '—')
const baseCurrency = computed(() => data.value?.accountingUnit.baseCurrency || '')

const toneClass: Record<DashboardCard['tone'], string> = {
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  teal: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

const metricPresentation: Record<string, { icon: Component; tone: DashboardCard['tone'] }> = {
  assets: { icon: Building2, tone: 'green' },
  liabilities: { icon: WalletCards, tone: 'amber' },
  revenue: { icon: CircleDollarSign, tone: 'blue' },
  expenditure: { icon: Banknote, tone: 'purple' },
}

const summaryCards = computed<DashboardCard[]>(() => {
  const cards: DashboardCard[] = (data.value?.metrics ?? []).map((metric) => {
    const presentation = metricPresentation[metric.key] ?? { icon: CircleDollarSign, tone: 'slate' as const }
    return {
      key: metric.key,
      label: metric.label,
      value: formatCurrency(metric.amount, metric.currency),
      detail: metric.note,
      icon: presentation.icon,
      tone: presentation.tone,
    }
  })

  const cashIcons: Component[] = [Banknote, Building2, WalletCards]
  const cashTones: DashboardCard['tone'][] = ['amber', 'teal', 'blue']
  for (const [index, cash] of (data.value?.cashPosition ?? []).entries()) {
    cards.push({
      key: `cash-${index}`,
      label: cash.label,
      value: formatCurrency(cash.amount, cash.currency),
      detail: `Linked bank GLs · through ${balanceAsOfText.value}`,
      icon: cashIcons[index] ?? Banknote,
      tone: cashTones[index] ?? 'slate',
    })
  }

  cards.push({
    key: 'pending-approvals',
    label: 'Pending approvals',
    value: String(data.value?.pendingApprovalCount ?? 0),
    detail: 'All matching journal batches',
    icon: ShieldCheck,
    tone: data.value?.pendingApprovalCount ? 'amber' : 'green',
  })
  return cards
})

function metricValue(key: string) {
  return data.value?.metrics.find(metric => metric.key === key)?.amount ?? '0'
}

function metricAmount(key: string) {
  return Number(metricValue(key))
}

function metricCurrency(key: string) {
  return data.value?.metrics.find((metric) => metric.key === key)?.currency ?? baseCurrency.value
}

function percentage(value: number) {
  return `${new Intl.NumberFormat('en-GH', { maximumFractionDigits: 1 }).format(value)}%`
}

const liabilityShare = computed(() => {
  const assets = metricAmount('assets')
  if (assets <= 0) return null
  return metricAmount('liabilities') / assets * 100
})
const expenditureShare = computed(() => {
  const revenue = metricAmount('revenue')
  if (revenue <= 0) return null
  return metricAmount('expenditure') / revenue * 100
})

const journalStatuses = computed(() => (data.value?.journalStatuses ?? []).map(status => ({
  ...status, color: dashboardStatuses.find(definition => definition.value === status.status)?.color || '#94a3b8',
})))
const journalStatusTotal = computed(() => data.value?.journalCount ?? 0)

function comparisonChartOption(rows: Array<{ label: string; value: number; color: string }>, currency: string): EChartsOption {
  const maxValue = Math.max(0, ...rows.map((row) => row.value))
  return {
    animationDuration: 450,
    grid: { top: 4, right: 52, bottom: 4, left: 76 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      backgroundColor: '#14231f',
      borderWidth: 0,
      textStyle: { color: '#f8fafc', fontSize: 11 },
      formatter: (items: any) => {
        const item = Array.isArray(items) ? items[0] : items
        return `${item?.name ?? ''}<br/><strong>${formatCurrency(Number(item?.value ?? 0), currency)}</strong>`
      },
    },
    xAxis: {
      type: 'value',
      max: maxValue > 0 ? maxValue * 1.45 : 1,
      show: false,
      splitLine: { show: false },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map((row) => row.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10, margin: 10 },
    },
    series: [{
      type: 'bar',
      barWidth: 13,
      showBackground: true,
      backgroundStyle: { color: 'rgba(148, 163, 184, 0.14)', borderRadius: 7 },
      label: {
        show: true,
        position: 'right',
        distance: 6,
        color: '#64748b',
        fontSize: 10,
        formatter: (params: any) => formatCompact(Number(params.value)),
      },
      data: rows.map((row) => ({
        value: row.value,
        itemStyle: { color: row.color, borderRadius: [0, 7, 7, 0] },
      })),
    }],
  }
}

const balanceSheetChartOption = computed(() => comparisonChartOption([
  { label: 'Assets', value: metricAmount('assets'), color: '#1e5d50' },
  { label: 'Liabilities', value: metricAmount('liabilities'), color: '#d97706' },
], metricCurrency('assets')))

const operatingResultChartOption = computed(() => comparisonChartOption([
  { label: 'Revenue', value: metricAmount('revenue'), color: '#2563eb' },
  { label: 'Expenditure', value: metricAmount('expenditure'), color: '#7c3aed' },
], metricCurrency('revenue')))

const journalStatusChartOption = computed<EChartsOption>(() => {
  const slices = journalStatuses.value
    .filter((status) => status.count > 0)
    .map((status) => ({
      name: status.label,
      value: status.count,
      itemStyle: { color: status.color },
    }))

  return {
    animationDuration: 450,
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#14231f',
      borderWidth: 0,
      textStyle: { color: '#f8fafc', fontSize: 11 },
      formatter: (params: any) => `${params.name}<br/><strong>${params.value}</strong> entries (${params.percent}%)`,
    },
    series: [{
      type: 'pie',
      radius: ['65%', '91%'],
      center: ['50%', '50%'],
      padAngle: 2,
      label: { show: false },
      labelLine: { show: false },
      itemStyle: { borderColor: '#ffffff', borderWidth: 2, borderRadius: 4 },
      emphasis: { scale: true, scaleSize: 4 },
      data: slices.length ? slices : [{ name: 'No entries', value: 1, itemStyle: { color: '#cbd5e1' } }],
    }],
  }
})

function statusClass(status: string) {
  if (status === 'Posted') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-900/25 dark:text-emerald-300 dark:ring-emerald-400/20'
  if (status === 'Pending approval') return 'bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-900/25 dark:text-amber-300 dark:ring-amber-400/20'
  if (status === 'Approved') return 'bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-900/25 dark:text-blue-300 dark:ring-blue-400/20'
  if (status === 'Rejected') return 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-900/25 dark:text-rose-300'
  if (status === 'Reversed' || status === 'Voided') return 'bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20'
  return 'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-900/25 dark:text-violet-300 dark:ring-violet-400/20'
}

const quickActions: Array<{ label: string; description: string; to: string; icon: Component }> = [
  { label: 'New journal draft', description: 'Record an accounting entry', to: '/ledger/journals/new', icon: BookOpenCheck },
  { label: 'Budget planning', description: 'Plan account amounts by period', to: '/ledger/budgets', icon: CircleDollarSign },
  { label: 'Chart of accounts', description: 'Review accounts and balances', to: '/ledger/accounts', icon: ListTree },
  { label: 'Journal register', description: 'Browse recent batches', to: '/ledger/journals', icon: ChartNoAxesCombined },
  { label: 'Module manager', description: 'Switch workspaces', to: '/modules', icon: LayoutGrid },
]
</script>

<template>
  <div class="space-y-6 font-sora">
    <section class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#183f38] via-[#1e5d50] to-[#2f8d79] p-6 text-white shadow-sm sm:p-7">
      <div class="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/[0.10]" />
      <div class="pointer-events-none absolute bottom-[-5rem] right-24 h-52 w-52 rounded-full bg-white/[0.06]" />
      <div class="relative flex flex-wrap items-end justify-between gap-5">
        <div class="max-w-2xl">
          <div class="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
            <span>Operations console</span>
            <span class="text-white/40">·</span>
            <span>Live ledger reporting</span>
          </div>
          <h1 class="mt-2 text-2xl font-bold leading-snug tracking-tight sm:text-[28px]">{{ data?.accountingUnit.name ?? 'General Ledger' }}</h1>
          <p class="mt-2 max-w-xl text-sm leading-relaxed text-white/75">Your accounting position, cash balances, and journal activity at a glance.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" :disabled="pending || optionsPending || !!validation || !filters.accountingUnitId" class="inline-flex h-9 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60" @click="refresh()">
            <RefreshCw :size="14" :class="pending ? 'animate-spin' : ''" /> Refresh
          </button>
          <NuxtLink to="/ledger/accounts" class="inline-flex h-9 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3.5 text-xs font-semibold text-white transition hover:bg-white/20">
            <ListTree :size="14" /> Chart of accounts
          </NuxtLink>
          <NuxtLink to="/ledger/journals/new" class="inline-flex h-9 items-center gap-2 rounded-lg bg-[#e8a33d] px-3.5 text-xs font-bold text-[#0c231c] shadow-sm transition hover:brightness-105">
            <Plus :size="15" /> New journal
          </NuxtLink>
        </div>
      </div>
    </section>

    <section aria-labelledby="dashboard-filters-title" class="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#15201e]">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="dashboard-filters-title" class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><SlidersHorizontal :size="16" /> Reporting filters</h2>
          <p class="mt-1 text-[11px] text-slate-500">Filters update automatically. Select one accounting unit to keep base-currency totals comparable.</p>
        </div>
        <button type="button" :disabled="optionsPending || !!optionsError" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="resetFilters"><RotateCcw :size="13" /> Reset filters</button>
      </header>
      <div v-if="optionsError" role="alert" class="mt-4 flex items-start justify-between gap-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"><span>{{ optionsError }}</span><button type="button" class="shrink-0 font-semibold underline" @click="refreshOptions()">Retry filter options</button></div>
      <p v-else-if="optionsPending" role="status" class="mt-4 text-xs text-slate-500">Loading live dashboard filters…</p>
      <div v-else-if="!options.accountingUnits.length" role="status" class="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-900/40">No active accounting units with a base currency are available. <NuxtLink to="/ledger/accounting-units" class="font-semibold text-brand-700 underline dark:text-brand-300">Configure an accounting unit</NuxtLink> to view its ledger dashboard.</div>
      <form v-else class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" @submit.prevent="refresh()">
        <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Accounting unit
          <select v-model="filters.accountingUnitId" aria-label="Dashboard accounting unit" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option v-for="unit in options.accountingUnits" :key="unit.id" :value="unit.id">{{ unit.code }} · {{ unit.name }} · {{ unit.baseCurrency }}</option></select>
        </label>
        <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Date range
          <select v-model="datePreset" aria-label="Date range" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700 dark:bg-slate-900" @change="applyDatePreset"><option value="month-to-date">Month to date</option><option value="quarter-to-date">Quarter to date</option><option value="year-to-date">Year to date</option><option value="fiscal-year-to-date">Fiscal year to date</option><option value="last-month">Last month</option><option value="custom">Custom range</option></select>
        </label>
        <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">From date
          <input v-model="filters.dateFrom" type="date" aria-label="From date" min="1900-01-01" max="2999-12-31" required class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700 dark:bg-slate-900" @input="datePreset = 'custom'" />
        </label>
        <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Through date
          <input v-model="filters.dateTo" type="date" aria-label="Through date" min="1900-01-01" max="2999-12-31" required class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700 dark:bg-slate-900" @input="datePreset = 'custom'" />
        </label>
        <div>
          <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Cost center
            <select v-model="filters.costCenterId" aria-label="Dashboard cost center" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="">All cost centers</option><option value="unassigned">Unassigned</option><option v-for="center in costCenters" :key="center.id" :value="center.id">{{ center.label }}</option></select>
          </label>
          <label class="mt-2 flex items-center gap-2 text-[10px] text-slate-500"><input v-model="filters.includeChildCostCenters" type="checkbox" aria-label="Include child cost centers" :disabled="!filters.costCenterId || filters.costCenterId === 'unassigned'" class="rounded border-slate-300 text-brand-700" /> Include child cost centers</label>
        </div>
        <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Transaction source
          <select v-model="filters.source" aria-label="Transaction source" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="">All sources</option><option v-for="source in options.sources" :key="source" :value="source">{{ dashboardSourceLabel(source) }}</option></select>
        </label>
        <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Transaction currency
          <select v-model="filters.currencyId" aria-label="Dashboard transaction currency" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="">All currencies</option><option v-for="currency in options.currencies" :key="currency.id" :value="currency.id">{{ currency.code }} · {{ currency.name }}</option></select>
        </label>
        <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Journal status (activity only)
          <select v-model="filters.status" aria-label="Journal status (activity only)" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="">All statuses</option><option v-for="status in dashboardStatuses" :key="status.value" :value="status.value">{{ status.label }}</option></select>
        </label>
      </form>
      <p v-if="validation" role="alert" class="mt-3 text-xs font-semibold text-rose-700 dark:text-rose-300">{{ validation }}</p>
      <p class="mt-4 border-t border-slate-100 pt-3 text-[10px] leading-relaxed text-slate-500 dark:border-slate-800">Assets, liabilities and linked-bank balances include posted history through the end date. Revenue and expenditure use the selected date range, excluding opening entries. Other filters apply to every section; journal status applies only to activity. Financial indicators and matched journal debits use the unit's base currency; bank balances retain their recorded transaction currencies.</p>
    </section>

    <div v-if="error" role="alert" class="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
      <div>
        <p class="font-semibold">Dashboard data is unavailable</p>
        <p class="mt-1 text-xs opacity-80">{{ error }}</p>
      </div>
      <div class="flex shrink-0 gap-3"><button class="text-xs font-semibold underline underline-offset-2" @click="refresh()">Retry</button><button class="text-xs font-semibold underline underline-offset-2" @click="refreshOptions()">Reload filters</button></div>
    </div>

    <div v-if="optionsPending || pending" role="status" aria-label="Loading ledger dashboard" class="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <div v-for="item in 8" :key="item" class="h-[126px] animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#15201e]" />
    </div>

    <template v-else-if="data">
    <p v-if="!data.postedLineCount" role="status" class="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-[#15201e]">No posted ledger lines match this scope through {{ balanceAsOfText }}. Financial totals are zero; matching unposted journal activity is shown below.</p>
    <p v-if="data.unclassifiedLineCount" role="alert" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">{{ data.unclassifiedLineCount }} posted lines have an unknown account type and are excluded from financial indicators. Review their GL account classifications.</p>
    <p v-if="data.reclassifiedLineCount" role="alert" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">{{ data.reclassifiedLineCount }} posted lines differ from the current chart classification. Indicators use current live GL account types, with historical types retained for unavailable accounts, matching financial reports.</p>
    <section class="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Financial indicators">
      <article v-for="card in summaryCards" :key="card.key" class="flex min-h-[126px] items-start gap-3.5 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#15201e] sm:p-5">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" :class="toneClass[card.tone]">
          <component :is="card.icon" :size="19" :stroke-width="1.8" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-[11px]">{{ card.label }}</p>
          <p class="mt-1.5 truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">{{ card.value }}</p>
          <p class="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">{{ card.detail }}</p>
        </div>
      </article>
    </section>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(310px,1fr)]">
      <article class="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[#15201e]">
        <header class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Financial health</h2>
            <p class="mt-1 text-[11px] text-slate-400">Posted balances through {{ balanceAsOfText }} · performance for {{ periodText }}</p>
          </div>
          <span class="rounded-md bg-slate-50 px-2.5 py-1.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{{ baseCurrency }}</span>
        </header>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div class="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><Building2 :size="15" class="text-brand-700 dark:text-brand-300" /> Balance sheet</div>
            <div class="mt-4 flex items-end justify-between gap-3">
              <div><p class="text-[10px] text-slate-400">Total assets</p><p class="mt-1 text-sm font-bold tabular-nums text-slate-900 dark:text-white">{{ formatCurrency(metricValue('assets'), metricCurrency('assets')) }}</p></div>
              <div class="text-right"><p class="text-[10px] text-slate-400">Total liabilities</p><p class="mt-1 text-sm font-bold tabular-nums text-slate-900 dark:text-white">{{ formatCurrency(metricValue('liabilities'), metricCurrency('liabilities')) }}</p></div>
            </div>
            <SharedEChart
              class="mt-2"
              :option="balanceSheetChartOption"
              :height="88"
              :aria-label="`Balance sheet comparison. Assets ${formatCurrency(metricValue('assets'), metricCurrency('assets'))}; liabilities ${formatCurrency(metricValue('liabilities'), metricCurrency('liabilities'))}.`"
            />
            <p class="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{{ liabilityShare === null ? 'Liability ratio is unavailable when assets are zero or negative.' : `Liabilities are ${percentage(liabilityShare)} of reported assets.` }}</p>
          </div>

          <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div class="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><ChartNoAxesCombined :size="15" class="text-blue-600 dark:text-blue-300" /> Operating result · selected period</div>
            <div class="mt-4 flex items-end justify-between gap-3">
              <div><p class="text-[10px] text-slate-400">Revenue</p><p class="mt-1 text-sm font-bold tabular-nums text-slate-900 dark:text-white">{{ formatCurrency(metricValue('revenue'), metricCurrency('revenue')) }}</p></div>
              <div class="text-right"><p class="text-[10px] text-slate-400">Expenditure</p><p class="mt-1 text-sm font-bold tabular-nums text-slate-900 dark:text-white">{{ formatCurrency(metricValue('expenditure'), metricCurrency('expenditure')) }}</p></div>
            </div>
            <SharedEChart
              class="mt-2"
              :option="operatingResultChartOption"
              :height="88"
              :aria-label="`Selected-period comparison. Revenue ${formatCurrency(metricValue('revenue'), metricCurrency('revenue'))}; expenditure ${formatCurrency(metricValue('expenditure'), metricCurrency('expenditure'))}.`"
            />
            <p class="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{{ expenditureShare === null ? 'Expenditure ratio is unavailable when revenue is zero or negative.' : `Expenditure is ${percentage(expenditureShare)} of reported revenue.` }}</p>
          </div>
        </div>
      </article>

      <article class="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[#15201e]">
        <header>
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Journal status mix</h2>
          <p class="mt-1 text-[11px] text-slate-400">All {{ journalStatusTotal }} matching journal batches</p>
        </header>
        <div class="mt-5 flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
          <div class="relative h-36 w-36 shrink-0">
            <SharedEChart
              class="absolute inset-0"
              :option="journalStatusChartOption"
              height="100%"
              :aria-label="`Journal status distribution across all ${journalStatusTotal} matching batches`"
            />
            <div class="pointer-events-none absolute inset-[24px] flex flex-col items-center justify-center rounded-full bg-white dark:bg-[#15201e]">
              <span class="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{{ journalStatusTotal }}</span>
              <span class="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Matching batches</span>
            </div>
          </div>
          <div class="w-full space-y-2.5">
            <div v-for="status in journalStatuses" :key="status.label" class="flex items-center gap-2.5 text-[11px]">
              <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: status.color }" />
              <span class="flex-1 truncate text-slate-500 dark:text-slate-400">{{ status.label }}</span>
              <span class="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{{ status.count }}</span>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <article class="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[#15201e] xl:col-span-2">
        <header class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Cash &amp; bank position</h2>
            <p class="mt-1 text-[11px] text-slate-400">Linked bank GL balances in transaction currencies · through {{ balanceAsOfText }}</p>
          </div>
          <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300"><WalletCards :size="17" /></span>
        </header>
        <div v-if="data?.cashPosition.length" class="mt-4 grid gap-3 sm:grid-cols-3">
          <div v-for="(cash, index) in data.cashPosition" :key="cash.label" class="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-lg" :class="toneClass[index === 0 ? 'amber' : index === 1 ? 'teal' : 'blue']">
                <component :is="index === 0 ? Banknote : index === 1 ? Building2 : WalletCards" :size="14" />
              </span>
              <p class="min-w-0 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{{ cash.label }}</p>
            </div>
            <p class="mt-3 text-base font-bold tabular-nums text-slate-900 dark:text-white">{{ formatCurrency(cash.amount, cash.currency) }}</p>
            <p class="mt-1 text-[10px] text-slate-400">Posted balance · {{ cash.currency }}</p>
          </div>
        </div>
        <div v-else class="mt-4 rounded-lg bg-slate-50 px-4 py-8 text-center text-xs text-slate-400 dark:bg-slate-900/40">No cash or bank balances are available.</div>
      </article>

      <article class="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[#15201e]">
        <header class="flex items-start justify-between gap-3">
          <div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Awaiting approval</h2><p class="mt-1 text-[11px] text-slate-400">All {{ data.pendingApprovalCount }} matching pending batches · showing up to 5</p></div>
          <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300"><Clock :size="17" /></span>
        </header>
        <div v-if="pendingJournals.length" class="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          <NuxtLink v-for="journal in pendingJournals" :key="journal.id" to="/ledger/journals" class="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300"><BookOpenCheck :size="15" /></span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{{ journal.description }}</span>
              <span class="mt-1 block text-[10px] text-slate-400">{{ journal.batchNumber }} · {{ formatDate(journal.date) }}</span>
            </span>
            <ArrowRight :size="14" class="mt-1 shrink-0 text-slate-400" />
          </NuxtLink>
        </div>
        <div v-else class="mt-4 flex min-h-[125px] flex-col items-center justify-center rounded-xl bg-emerald-50/70 px-4 text-center dark:bg-emerald-900/15">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300">✓</span>
          <p class="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-100">All caught up</p>
          <p class="mt-1 text-[10px] text-slate-500 dark:text-slate-400">No journal batches are awaiting approval for these filters.</p>
        </div>
        <NuxtLink to="/ledger/journals" class="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300">Open journal register <ArrowRight :size="13" /></NuxtLink>
      </article>
    </section>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <article class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[#15201e] xl:col-span-2">
        <header class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Recent journal activity</h2><p class="mt-1 text-[11px] text-slate-400">Latest 10 of {{ journalStatusTotal }} matching batches · {{ periodText }}</p></div>
          <NuxtLink to="/ledger/journals" class="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300">View all <ArrowRight :size="14" /></NuxtLink>
        </header>
        <div v-if="pending && !data" class="space-y-3 p-5"><div v-for="item in 4" :key="item" class="h-9 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" /></div>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[720px] text-left">
            <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50">
              <tr><th class="px-5 py-3">Batch</th><th class="px-4 py-3">Description</th><th class="px-4 py-3">Date</th><th class="px-4 py-3">Matched debits · {{ baseCurrency }}</th><th class="px-4 py-3">Status</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="journal in recentJournals" :key="journal.id" class="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                <td class="px-5 py-3.5"><span class="font-mono text-[11px] font-semibold text-brand-700 dark:text-brand-300">{{ journal.batchNumber }}</span><span class="mt-1 block text-[10px] text-slate-400">{{ dashboardSourceLabel(journal.source) }}</span></td>
                <td class="max-w-[260px] truncate px-4 py-3.5 text-xs font-medium text-slate-700 dark:text-slate-200">{{ journal.description }}</td>
                <td class="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">{{ formatDate(journal.date) }}</td>
                <td class="whitespace-nowrap px-4 py-3.5 text-xs tabular-nums text-slate-600 dark:text-slate-300">{{ formatCurrency(journal.debit, baseCurrency) }}</td>
                <td class="px-4 py-3.5"><span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset" :class="statusClass(journal.status)">{{ journal.status }}</span></td>
              </tr>
              <tr v-if="!recentJournals.length"><td colspan="5" class="px-5 py-10 text-center text-xs text-slate-400">No journal activity matches the selected filters.</td></tr>
            </tbody>
          </table>
        </div>
        <footer class="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-800">
          <span>Updated {{ asOfText }}</span>
          <span class="inline-flex items-center gap-1.5"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Double-entry workflow</span>
        </footer>
      </article>

      <article class="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[#15201e]">
        <header class="flex items-start gap-3">
          <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"><Activity :size="17" /></span>
          <div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Quick actions</h2><p class="mt-1 text-[11px] text-slate-400">Jump to a common task</p></div>
        </header>
        <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <NuxtLink v-for="action in quickActions" :key="action.to" :to="action.to" class="group flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-3 transition hover:border-brand-200 hover:bg-brand-50/50 dark:border-slate-800 dark:hover:border-brand-900 dark:hover:bg-brand-900/15">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition group-hover:bg-white group-hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-900 dark:group-hover:text-brand-300"><component :is="action.icon" :size="15" /></span>
            <span class="min-w-0 flex-1"><span class="block truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{{ action.label }}</span><span class="mt-0.5 block truncate text-[10px] text-slate-400">{{ action.description }}</span></span>
            <ArrowRight :size="13" class="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-700 dark:group-hover:text-brand-300" />
          </NuxtLink>
        </div>
        <div class="mt-4 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/40">
          <div class="flex items-center justify-between gap-3"><span class="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Accounting unit</span><span class="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{{ data?.accountingUnit.code ?? '—' }}</span></div>
          <p class="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{{ data?.accountingUnit.name ?? 'BusinessDesk' }}</p>
          <p class="mt-0.5 text-[10px] text-slate-400">Base currency · {{ baseCurrency }}</p>
        </div>
      </article>
    </section>
    </template>
  </div>
</template>
