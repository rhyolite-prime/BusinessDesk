<script setup lang="ts">
const { money, pct, num, dateTime, date, relative } = useFormat()
const { meta } = useStatusMeta()
const { brand } = useBrand()

const { data: summary } = await useAsyncData('dash-summary', () => $fetch<any>('/api/dashboard/summary'))
const { data: trend } = await useAsyncData('dash-trend', () => $fetch<any>('/api/dashboard/trend'))

const k = computed(() => summary.value?.kpis ?? {})
const palette = ['#0B6E4F', '#1D4ED8', '#E8A33D', '#7C3AED', '#DC2626', '#0EA5E9']
const moneyFmt = (n: number) => money(n)

const statusSegments = computed(() => {
  const tones: Record<string, string> = {
    active: '#0B6E4F', closed: '#94A3B8', submitted: '#F59E0B',
    approved: '#3B82F6', rejected: '#DC2626', writtenoff: '#7F1D1D',
  }
  return (summary.value?.portfolioByStatus ?? []).filter((s: any) => s.count > 0)
    .map((s: any) => ({ label: meta(s.status).label, value: s.count, color: tones[s.status] ?? '#94A3B8' }))
})

const trendSeries = computed(() => [
  { name: 'Disbursed', color: '#0B6E4F', points: trend.value?.disbursements ?? [] },
  { name: 'Repayments', color: '#1D4ED8', points: trend.value?.repayments ?? [] },
  { name: 'Deposits', color: '#E8A33D', points: trend.value?.deposits ?? [] },
])

const productBars = computed(() => {
  const items = summary.value?.portfolioByProduct ?? []
  return {
    labels: items.map((x: any) => x.product),
    series: [{ name: 'Outstanding', color: '#0B6E4F', values: items.map((x: any) => x.outstanding) }],
  }
})

const toneFor = (entity: string) => {
  if (entity.includes('Repay') || entity.includes('Deposit')) return 'text-emerald-600'
  if (entity.includes('Reject') || entity.includes('fail')) return 'text-red-600'
  if (entity.includes('Approve') || entity.includes('Activate')) return 'text-blue-600'
  return 'text-ink-soft'
}
</script>

<template>
  <div v-if="summary" class="space-y-6">
    <!-- Welcome strip -->
    <div class="rounded-2xl p-6 sm:p-7 text-white relative overflow-hidden"
      style="background: linear-gradient(120deg, var(--brand-primary-dark), var(--brand-primary));">
      <div class="absolute -right-10 -top-16 w-64 h-64 rounded-full bg-white/10" />
      <div class="absolute right-24 -bottom-20 w-52 h-52 rounded-full bg-white/5" />
      <div class="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-white/70 text-xs uppercase tracking-widest">Operations console · {{ date(new Date().toISOString()) }}</p>
          <h1 class="text-2xl font-bold mt-1">Welcome to {{ brand.institutionShort }} Operations</h1>
          <p class="text-white/75 text-sm mt-1">{{ brand.tagline }} — here is your institution at a glance.</p>
        </div>
        <div class="flex gap-2">
          <BaseButton to="/clients/new" variant="secondary" size="sm" icon="plus" class="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">New Client</BaseButton>
          <BaseButton to="/loans/new" size="sm" icon="credit-card" class="!bg-accent !text-sidebar hover:opacity-90">New Loan</BaseButton>
        </div>
      </div>
    </div>

    <!-- KPI cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Gross Loan Portfolio" :value="money(k.outstandingPortfolio)" icon="banknotes" tone="primary"
        :hint="`${num(k.activeLoans)} active loans`" />
      <StatCard label="Portfolio at Risk" :value="pct(k.parPct)" icon="exclamation-triangle"
        :tone="k.parPct > 0.1 ? 'red' : k.parPct > 0.05 ? 'amber' : 'green'"
        :hint="money(k.overduePortfolio) + ' overdue'" />
      <StatCard label="Savings Deposits" :value="money(k.savingsBalance)" icon="wallet" tone="blue"
        :hint="`${num(k.savingsAccounts)} active accounts`" />
      <StatCard label="Active Clients" :value="num(k.activeClients)" icon="users" tone="green"
        :hint="`${num(k.totalClients)} total · ${k.pendingClients} pending`" />
      <StatCard label="Disbursed This Month" :value="money(k.disbursedThisMonth)" icon="arrow-trending-up" tone="purple"
        :trend="`${num(k.newClientsThisMonth)} new clients`" :trend-up="true" />
      <StatCard label="Deposits This Month" :value="money(k.depositsThisMonth)" icon="arrow-trending-down" tone="green" />
      <StatCard label="Cash & Bank Balance" :value="money(k.cashBalance)" icon="building-library" tone="amber" />
      <StatCard label="Pending Approvals" :value="num(k.pendingTasks)" icon="shield-check"
        :tone="k.pendingTasks ? 'red' : 'green'">
        <template #default />
      </StatCard>
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <BaseCard title="Portfolio Movement" subtitle="Disbursements, repayments & deposits — last 12 months"
        icon="chart-bar-square" class="xl:col-span-2">
        <ChartLine :labels="trend?.labels ?? []" :series="trendSeries" :format="moneyFmt" />
      </BaseCard>
      <BaseCard title="Loan Book Mix" subtitle="Accounts by lifecycle status" icon="list-bullet">
        <ChartDonut :segments="statusSegments"
          :center-value="num(statusSegments.reduce((s, x) => s + x.value, 0))" center-label="loan accounts" />
      </BaseCard>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <BaseCard title="Outstanding by Product" subtitle="Active portfolio per loan product" icon="cube" class="xl:col-span-2">
        <ChartBars v-if="productBars.labels.length" :labels="productBars.labels" :series="productBars.series" :format="moneyFmt" />
        <EmptyState v-else title="No active portfolio" />
      </BaseCard>

      <!-- Maker-checker queue snapshot -->
      <BaseCard title="Awaiting Approval" subtitle="Maker-checker queue" icon="shield-check">
        <template #actions><BaseButton to="/system/tasks" variant="ghost" size="sm">Open queue <AppIcon name="arrow-right" :size="14" /></BaseButton></template>
        <ul v-if="summary?.pendingTasks?.length" class="divide-y divide-line -mx-5">
          <li v-for="t in summary.pendingTasks" :key="t.id">
            <NuxtLink :to="t.entityType === 'LOAN' ? `/loans/${t.entityId}` : t.entityType === 'SAVINGS' ? `/savings/${t.entityId}` : t.entityType === 'CLIENT' ? `/clients/${t.entityId}` : '/system/tasks'"
              class="flex items-start gap-3 px-5 py-3 hover:bg-primary-soft/40">
              <span class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <AppIcon name="clock" :size="15" />
              </span>
              <span class="min-w-0">
                <span class="block text-xs font-semibold text-ink">{{ t.action }}</span>
                <span class="block text-[11px] text-ink-faint truncate">{{ t.entityLabel }}</span>
                <span class="block text-[10px] text-ink-faint mt-0.5">{{ t.makerName }} · {{ relative(t.createdDate) }}</span>
              </span>
              <span v-if="t.amount" class="ml-auto text-xs font-bold tnum text-ink shrink-0">{{ money(t.amount) }}</span>
            </NuxtLink>
          </li>
        </ul>
        <EmptyState v-else icon="check-circle" title="All caught up" message="No transactions awaiting checker approval." />
      </BaseCard>
    </div>

    <!-- Activity + quick links -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <BaseCard title="Recent Activity" subtitle="Audit trail across all modules" icon="document-text" class="xl:col-span-2">
        <template #actions><BaseButton to="/system/audit" variant="ghost" size="sm">Full audit log</BaseButton></template>
        <ul class="divide-y divide-line -mx-5 -my-5">
          <li v-for="a in summary?.recentActivity ?? []" :key="a.id" class="flex items-center gap-3 px-5 py-2.5">
            <span class="w-2 h-2 rounded-full shrink-0" :class="a.result === 'failure' ? 'bg-red-500' : toneFor(a.action).includes('emerald') ? 'bg-emerald-500' : toneFor(a.action).includes('blue') ? 'bg-blue-500' : 'bg-slate-300'" />
            <div class="min-w-0 flex-1">
              <p class="text-xs text-ink">
                <strong>{{ a.userName }}</strong>
                <span class="text-ink-faint"> · {{ a.action.toLowerCase() }} </span>
                <span class="font-medium">{{ a.entity.toLowerCase() }}</span>
                <span class="text-ink-faint"> — {{ a.entityName }}</span>
              </p>
            </div>
            <span class="text-[10px] text-ink-faint shrink-0">{{ dateTime(a.timestamp) }}</span>
          </li>
        </ul>
      </BaseCard>

      <BaseCard title="Quick Actions" subtitle="Jump to a common task" icon="sparkles">
        <div class="grid grid-cols-2 gap-2">
          <BaseButton to="/clients/new" variant="secondary" icon="user" size="sm" block>Onboard client</BaseButton>
          <BaseButton to="/loans/new" variant="secondary" icon="credit-card" size="sm" block>Originate loan</BaseButton>
          <BaseButton to="/savings" variant="secondary" icon="wallet" size="sm" block>Post deposit</BaseButton>
          <BaseButton to="/loans" variant="secondary" icon="banknotes" size="sm" block>Repayment</BaseButton>
          <BaseButton to="/accounting/journal" variant="secondary" icon="document-text" size="sm" block>Journal entry</BaseButton>
          <BaseButton to="/reports" variant="secondary" icon="chart-bar-square" size="sm" block>Run report</BaseButton>
        </div>
        <div class="mt-4 pt-4 border-t border-line">
          <p class="text-[11px] font-semibold text-ink-faint uppercase tracking-wide mb-2">Module status</p>
          <div class="space-y-1.5 text-xs text-ink-soft">
            <p class="flex justify-between"><span>Core API (stub)</span><Badge size="sm" tone="green" dot>online</Badge></p>
            <p class="flex justify-between"><span>USSD gateway</span><Badge size="sm" tone="gray">configured</Badge></p>
            <p class="flex justify-between"><span>Mobile banking</span><Badge size="sm" tone="gray">configured</Badge></p>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
