<script setup lang="ts">
import { Activity, ArrowRight, ArrowUpRight, BadgeCheck, Banknote, CalendarDays, ChartNoAxesCombined, Clock3, FileText, LockKeyhole, Play, ShieldCheck, Users, Wallet } from '@lucide/vue'
import type { EChartsOption } from 'echarts'
import { payrollPages } from '../../features/payroll/catalog'
import { usePayrollDemoData } from '../../features/payroll/demo-data'

definePageMeta({ layout: 'admin-payroll' })
useHead({ title: 'Payroll dashboard' })

const payroll = usePayrollDemoData()
const periodInput = ref(payroll.cycle.value.period)
const activeEmployees = computed(() => payroll.employees.value.filter((employee) => employee.status === 'Active'))
const activeCount = computed(() => activeEmployees.value.length)
const projectedGross = computed(() => activeEmployees.value.reduce((total, employee) => total + employee.baseSalary * 1.055, 0))
const projectedNet = computed(() => projectedGross.value * 0.824)
const awaitingApprovals = computed(() => payroll.notifications.value.length)
const periodLabel = computed(() => {
  const [year, month] = payroll.cycle.value.period.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GH', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year ?? 2026, (month ?? 10) - 1, 1)))
})
const cycleTone = computed(() => payroll.cycle.value.status === 'Posted'
  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-300'
  : payroll.cycle.value.status === 'Calculated'
    ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/35 dark:text-blue-300'
    : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')

function formatGhs(value: number) {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 0 }).format(value)
}

function setPeriod() {
  if (!/^\d{4}-\d{2}$/.test(periodInput.value)) return
  payroll.setPeriod(periodInput.value)
}

const payrollTrendOption = computed<EChartsOption>(() => ({
  color: ['#147d6d', '#d89b37'],
  animationDuration: 500,
  tooltip: {
    trigger: 'axis',
    confine: true,
    backgroundColor: '#14231f',
    borderWidth: 0,
    textStyle: { color: '#f8fafc', fontSize: 11 },
    valueFormatter: (value) => formatGhs(Number(value)),
  },
  grid: { top: 12, right: 14, bottom: 16, left: 12, containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    axisLine: { lineStyle: { color: '#e5e7eb' } },
    axisTick: { show: false },
    axisLabel: { color: '#94a3b8', fontSize: 10 },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#94a3b8', fontSize: 9, formatter: (value: number) => `₵${Math.round(value / 1000)}k` },
    splitLine: { lineStyle: { color: '#edf0f2', type: 'dashed' } },
  },
  series: [
    { name: 'Gross payroll', type: 'line', smooth: true, showSymbol: false, lineStyle: { width: 3 }, areaStyle: { opacity: 0.1 }, data: [60400, 61700, 62800, 64100, 65800, 65500, 66900, Math.round(projectedGross.value)] },
    { name: 'Net payroll', type: 'line', smooth: true, showSymbol: false, lineStyle: { width: 2, type: 'dashed' }, data: [49600, 50700, 51400, 52700, 54200, 53900, 55000, Math.round(projectedNet.value)] },
  ],
}))

const departmentOption = computed<EChartsOption>(() => {
  const departments = ['Operations', 'Finance & Admin', 'Sales & Marketing', 'IT & People']
  return {
    color: ['#147d6d'],
    tooltip: { trigger: 'axis', confine: true, backgroundColor: '#14231f', borderWidth: 0, textStyle: { color: '#f8fafc', fontSize: 11 } },
    grid: { top: 8, right: 16, bottom: 8, left: 8, containLabel: true },
    xAxis: { type: 'value', max: 50, axisLabel: { color: '#94a3b8', fontSize: 9 }, splitLine: { lineStyle: { color: '#edf0f2', type: 'dashed' } } },
    yAxis: { type: 'category', data: departments, axisLabel: { color: '#64748b', fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{ type: 'bar', barWidth: 13, data: [41, 26, 19, 20], itemStyle: { borderRadius: [0, 6, 6, 0] }, label: { show: true, position: 'right', color: '#475569', fontSize: 10 } }],
  }
})

const deductionsOption: EChartsOption = {
  color: ['#147d6d', '#528e81', '#d89b37', '#8e78ba', '#cbd5e1'],
  tooltip: { trigger: 'item', confine: true, backgroundColor: '#14231f', borderWidth: 0, textStyle: { color: '#f8fafc', fontSize: 11 }, formatter: '{b}: {d}%' },
  series: [{
    type: 'pie',
    radius: ['61%', '82%'],
    center: ['50%', '50%'],
    avoidLabelOverlap: true,
    itemStyle: { borderColor: '#ffffff', borderWidth: 3 },
    label: { show: false },
    data: [
      { value: 38, name: 'PAYE' },
      { value: 25, name: 'SSNIT' },
      { value: 17, name: 'Tier 2 pension' },
      { value: 12, name: 'Staff loans' },
      { value: 8, name: 'Other' },
    ],
  }],
}

const quickPages = computed(() => [
  payrollPages.find((page) => page.path === '/payroll/people/employee-bio-data'),
  payrollPages.find((page) => page.path === '/payroll/people/employee-salary-info'),
  payrollPages.find((page) => page.path === '/payroll/process/run-payroll'),
  payrollPages.find((page) => page.path === '/payroll/reports/monthly/pay-register'),
].filter((page) => page !== undefined))

const activity = [
  { title: 'October pay run prepared', detail: 'Draft calculations are ready for review', time: 'Today · 09:42', icon: Activity, tone: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' },
  { title: 'Salary change submitted', detail: 'Two employees · effective 1 November', time: 'Yesterday · 15:18', icon: ArrowUpRight, tone: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
  { title: 'SSNIT data imported', detail: 'October contribution file validated', time: '14 Oct · 11:06', icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
]
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Payroll dashboard" :subtitle="`People, pay runs and statutory obligations · ${periodLabel}`" icon="banknotes">
      <label class="flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs text-ink-soft shadow-sm">
        <CalendarDays :size="15" class="text-ink-faint" />
        <span class="sr-only">Payroll period</span>
        <input v-model="periodInput" type="month" class="min-w-0 bg-transparent text-xs font-medium text-ink outline-none" @change="setPeriod">
      </label>
      <BaseButton to="/payroll/process/run-payroll" icon="play" size="sm">Process payroll</BaseButton>
    </PageHeader>

    <section class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3.5 dark:border-amber-900/60 dark:bg-amber-950/25" aria-label="Demo data notice">
      <LockKeyhole :size="17" class="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold text-amber-950 dark:text-amber-200">Preview workspace · no payroll service connected</p>
        <p class="mt-1 text-[11px] leading-5 text-amber-900/80 dark:text-amber-200/75">Figures and actions below use local demo data. Calculating or posting a pay run changes this browser preview only; it does not create bank instructions, payslips, tax filings or General Ledger entries.</p>
      </div>
      <span class="hidden shrink-0 rounded-full border border-amber-300/80 px-2.5 py-1 text-[10px] font-semibold text-amber-800 sm:inline-flex dark:border-amber-800 dark:text-amber-300">Local preview</span>
    </section>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Payroll overview metrics">
      <article class="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div class="flex items-start justify-between gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300"><Users :size="18" /></span><span class="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">{{ activeCount }} active</span></div>
        <p class="mt-4 text-xs font-medium text-ink-faint">Employees on payroll</p><p class="mt-1 text-2xl font-bold tracking-tight text-ink">{{ activeCount }} <span class="text-sm font-medium text-ink-faint">/ {{ payroll.employees.value.length }}</span></p><p class="mt-1 text-[11px] text-ink-faint">Across 5 departments</p>
      </article>
      <article class="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div class="flex items-start justify-between gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/35 dark:text-blue-300"><Banknote :size="18" /></span><span class="text-[10px] font-semibold text-blue-700 dark:text-blue-300">{{ periodLabel }}</span></div>
        <p class="mt-4 text-xs font-medium text-ink-faint">Projected gross payroll</p><p class="mt-1 text-2xl font-bold tracking-tight text-ink">{{ formatGhs(projectedGross) }}</p><p class="mt-1 text-[11px] text-ink-faint">Includes recurring allowances</p>
      </article>
      <article class="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div class="flex items-start justify-between gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/35 dark:text-violet-300"><Wallet :size="18" /></span><span class="text-[10px] font-semibold text-violet-700 dark:text-violet-300">After deductions</span></div>
        <p class="mt-4 text-xs font-medium text-ink-faint">Projected net pay</p><p class="mt-1 text-2xl font-bold tracking-tight text-ink">{{ formatGhs(projectedNet) }}</p><p class="mt-1 text-[11px] text-ink-faint">Estimated take-home pay</p>
      </article>
      <article class="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div class="flex items-start justify-between gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300"><ShieldCheck :size="18" /></span><span class="text-[10px] font-semibold text-amber-700 dark:text-amber-300">Needs review</span></div>
        <p class="mt-4 text-xs font-medium text-ink-faint">Items awaiting action</p><p class="mt-1 text-2xl font-bold tracking-tight text-ink">{{ awaitingApprovals }}</p><p class="mt-1 text-[11px] text-ink-faint">Approvals, imports and exceptions</p>
      </article>
    </section>

    <section class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
      <article class="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><p class="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Payroll cost</p><h2 class="mt-1 text-base font-semibold text-ink">Gross and net trend</h2><p class="mt-1 text-xs text-ink-faint">Monthly payroll totals · GHS · demo series</p></div>
          <span class="rounded-lg bg-primary-soft p-2 text-primary"><ChartNoAxesCombined :size="17" /></span>
        </div>
        <SharedEChart :option="payrollTrendOption" height="265px" aria-label="Gross and net payroll trend for March to October 2026" />
        <div class="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-ink-faint"><span class="inline-flex items-center gap-2"><i class="h-2 w-2 rounded-full bg-[#147d6d]" />Gross payroll</span><span class="inline-flex items-center gap-2"><i class="h-2 w-2 rounded-full bg-[#d89b37]" />Net payroll</span><span class="text-slate-400">Mar–Oct 2026</span></div>
      </article>
      <article class="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div class="flex items-start justify-between gap-3"><div><p class="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Payroll cycle</p><h2 class="mt-1 text-base font-semibold text-ink">{{ periodLabel }} run</h2><p class="mt-1 text-xs text-ink-faint">Current cycle readiness</p></div><span :class="['rounded-full border px-2.5 py-1 text-[10px] font-semibold', cycleTone]">{{ payroll.cycle.value.status }}</span></div>
        <div class="mt-5 space-y-3">
          <div v-for="(step, index) in [{ label: 'Employee changes reviewed', state: 'Complete' }, { label: 'Calculate payroll', state: payroll.cycle.value.status === 'Ready' ? 'Ready to run' : 'Complete' }, { label: 'Review exceptions', state: payroll.cycle.value.status === 'Ready' ? 'Next step' : 'Ready' }, { label: 'Post & distribute', state: payroll.cycle.value.status === 'Posted' ? 'Complete' : 'Pending' }]" :key="step.label" class="flex items-center gap-3">
            <span :class="['grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold', step.state === 'Complete' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-canvas text-ink-faint ring-1 ring-line']">{{ step.state === 'Complete' ? '✓' : String(index + 1).padStart(2, '0') }}</span>
            <span class="min-w-0 flex-1 truncate text-xs font-medium text-ink-soft">{{ step.label }}</span><span class="shrink-0 text-[10px] text-ink-faint">{{ step.state }}</span>
          </div>
        </div>
        <NuxtLink to="/payroll/process/run-payroll" class="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-on-primary transition hover:bg-primary-dark"><Play :size="14" /> Open pay run <ArrowRight :size="14" /></NuxtLink>
        <p class="mt-3 text-center text-[10px] leading-4 text-ink-faint">Demo workflow · no live posting or payment</p>
      </article>
    </section>

    <section class="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <article class="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5 xl:col-span-2">
        <div class="flex items-start justify-between gap-3"><div><p class="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Workforce</p><h2 class="mt-1 text-base font-semibold text-ink">Headcount by department</h2><p class="mt-1 text-xs text-ink-faint">Active employee records in the local sample</p></div><Users :size="18" class="text-primary" /></div>
        <SharedEChart :option="departmentOption" height="230px" aria-label="Employee headcount by department" />
      </article>
      <article class="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div class="flex items-start justify-between gap-3"><div><p class="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Deductions</p><h2 class="mt-1 text-base font-semibold text-ink">Payroll composition</h2><p class="mt-1 text-xs text-ink-faint">Illustrative distribution · Oct 2026</p></div><FileText :size="18" class="text-primary" /></div>
        <div class="relative mt-2"><SharedEChart :option="deductionsOption" height="200px" aria-label="Illustrative payroll deduction distribution" /><div class="pointer-events-none absolute inset-0 grid place-items-center"><div class="text-center"><p class="text-[10px] text-ink-faint">Deductions</p><p class="mt-0.5 text-lg font-bold text-ink">{{ formatGhs(projectedGross - projectedNet) }}</p></div></div></div>
        <div class="mt-1 grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] text-ink-faint"><span v-for="(item, index) in [{ label: 'PAYE', color: 'bg-[#147d6d]' }, { label: 'SSNIT', color: 'bg-[#528e81]' }, { label: 'Tier 2 pension', color: 'bg-[#d89b37]' }, { label: 'Loans & other', color: 'bg-[#8e78ba]' }]" :key="item.label" class="flex items-center gap-1.5"><i :class="['h-2 w-2 rounded-full', item.color]" />{{ item.label }}</span></div>
      </article>
    </section>

    <section class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <article class="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div class="flex items-center justify-between gap-3"><div><p class="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Payroll activity</p><h2 class="mt-1 text-base font-semibold text-ink">Recent updates</h2></div><Clock3 :size="17" class="text-ink-faint" /></div>
        <div class="mt-4 divide-y divide-line">
          <div v-for="item in activity" :key="item.title" class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-lg', item.tone]"><component :is="item.icon" :size="16" /></span><span class="min-w-0 flex-1"><span class="block truncate text-xs font-semibold text-ink">{{ item.title }}</span><span class="mt-1 block truncate text-[11px] text-ink-faint">{{ item.detail }}</span></span><span class="shrink-0 text-[10px] text-ink-faint">{{ item.time }}</span></div>
        </div>
      </article>
      <article class="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div class="flex items-center justify-between gap-3"><div><p class="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Shortcuts</p><h2 class="mt-1 text-base font-semibold text-ink">Common payroll tasks</h2></div><ArrowUpRight :size="17" class="text-ink-faint" /></div>
        <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <NuxtLink v-for="page in quickPages" :key="page.id" :to="page.path" class="group flex items-center gap-3 rounded-lg border border-line bg-canvas/50 px-3 py-3 transition hover:border-primary/25 hover:bg-primary-soft/35"><span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-primary ring-1 ring-line"><AppIcon :name="page.icon" :size="16" /></span><span class="min-w-0 flex-1"><span class="block truncate text-xs font-semibold text-ink">{{ page.title }}</span><span class="mt-0.5 block truncate text-[10px] text-ink-faint">{{ page.section === 'people' ? 'Employee administration' : page.section === 'process' ? 'Payroll cycle' : page.section === 'reports/monthly' ? 'Monthly reporting' : 'Payroll workspace' }}</span></span><ArrowRight :size="14" class="shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-primary" /></NuxtLink>
        </div>
      </article>
    </section>
    <p class="text-center text-[10px] text-ink-faint">All figures on this dashboard are illustrative local demo data and are not connected to a payroll service.</p>
  </div>
</template>
