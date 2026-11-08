<script setup lang="ts">
useHead({ title: 'Report' })
const route = useRoute()
const { money } = useFormat()
const { meta } = useStatusMeta()
const { data, pending } = await useAsyncData('report-' + route.params.key,
  () => $fetch<any>(`/api/reports/${route.params.key}`))
const { data: catalog } = await useAsyncData('report-catalog2', () => $fetch<any>('/api/reports'))
const reportDef = computed(() => catalog.value?.pageItems.find((r: any) => r.key === route.params.key))

// per-report column config
const columnsMap: Record<string, any[]> = {
  par: [
    { key: 'accountNo', label: 'Loan' }, { key: 'client', label: 'Client' }, { key: 'office', label: 'Office' },
    { key: 'officer', label: 'Officer' }, { key: 'product', label: 'Product' },
    { key: 'outstanding', label: 'Outstanding', align: 'right' }, { key: 'overdue', label: 'Overdue', align: 'right' },
    { key: 'dpd', label: 'Days past due', align: 'center' },
  ],
  collections: [
    { key: 'officer', label: 'Loan officer' }, { key: 'office', label: 'Office' },
    { key: 'activeAccounts', label: 'Accounts', align: 'center' },
    { key: 'expected', label: 'Expected', align: 'right' }, { key: 'collected', label: 'Collected', align: 'right' },
    { key: 'rate', label: 'Rate', align: 'center' },
  ],
  'trial-balance': [
    { key: 'glCode', label: 'GL' }, { key: 'name', label: 'Account' }, { key: 'type', label: 'Type' },
    { key: 'debit', label: 'Debit', align: 'right' }, { key: 'credit', label: 'Credit', align: 'right' },
  ],
  'savings-portfolio': [
    { key: 'product', label: 'Code' }, { key: 'name', label: 'Product' }, { key: 'rate', label: 'Rate' },
    { key: 'accounts', label: 'Accounts', align: 'center' }, { key: 'active', label: 'Active', align: 'center' },
    { key: 'dormant', label: 'Dormant', align: 'center' }, { key: 'balance', label: 'Deposits', align: 'right' },
  ],
  'loan-portfolio': [
    { key: 'product', label: 'Code' }, { key: 'name', label: 'Product' },
    { key: 'accounts', label: 'Active', align: 'center' }, { key: 'disbursed', label: 'Disbursed', align: 'right' },
    { key: 'outstanding', label: 'Outstanding', align: 'right' }, { key: 'overdue', label: 'Arrears', align: 'right' },
  ],
  'branch-performance': [
    { key: 'office', label: 'Office' }, { key: 'clients', label: 'Clients', align: 'center' },
    { key: 'staff', label: 'Staff', align: 'center' }, { key: 'activeLoans', label: 'Active loans', align: 'center' },
    { key: 'portfolio', label: 'Portfolio', align: 'right' }, { key: 'deposits', label: 'Deposits', align: 'right' },
  ],
}
const columns = computed(() => columnsMap[route.params.key as string] ?? [])

const moneyKeys = new Set(['expected', 'collected', 'debit', 'credit', 'balance', 'disbursed', 'outstanding', 'overdue', 'portfolio', 'deposits'])

function cellVal(key: string, row: any) {
  if (moneyKeys.has(key)) return money(row[key])
  if (key === 'rate') return (row.rate * 100).toFixed(1) + '%'
  if (key === 'type') return { ASSET: 'Asset', LIABILITY: 'Liability', EQUITY: 'Equity', INCOME: 'Income', EXPENSE: 'Expense' }[row.type] ?? row.type
  return row[key]
}
</script>

<template>
  <div v-if="data">
    <PageHeader :title="data.title" :icon="reportDef?.icon ?? 'chart-bar-square'"
      :subtitle="`Generated ${new Date(data.generatedAt).toLocaleString('en-GB')} · live from core`">
      <BaseButton to="/reports" variant="secondary" size="sm" icon="arrow-left-on-rectangle" class="rotate-180">All reports</BaseButton>
    </PageHeader>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <div v-for="s in data.summary" :key="s.label" class="bg-surface border border-line rounded-xl px-4 py-3.5">
        <p class="text-[10px] uppercase tracking-wide text-ink-faint font-semibold">{{ s.label }}</p>
        <p class="text-lg font-bold tnum mt-1 text-ink">{{ s.value }}</p>
      </div>
    </div>

    <BaseCard :pad="false">
      <EmptyState v-if="!data.rows?.length" icon="information-circle" title="No data" message="There are no records for this report right now." />
      <DataTable v-else :columns="columns" :rows="data.rows">
        <template #cell="{ col, row }">
          <span v-if="col.align === 'right'" class="tnum font-medium"
            :class="['overdue', 'arrears', 'debit', 'credit'].includes(col.key) ? (row[col.key] > 0 ? (col.key === 'overdue' || col.key === 'arrears' ? 'text-red-600 font-semibold' : '') : 'text-ink-faint') : ''">
            {{ cellVal(col.key, row) }}
          </span>
          <Badge v-else-if="col.key === 'dpd'" size="sm" :tone="row.dpd >= 90 ? 'red' : row.dpd >= 30 ? 'amber' : 'blue'">{{ row.dpd }}d</Badge>
          <span v-else-if="col.key === 'rate'" class="inline-flex items-center gap-1 font-semibold"
            :class="row.rate >= 0.85 ? 'text-emerald-600' : row.rate >= 0.6 ? 'text-amber-600' : 'text-red-600'">{{ cellVal(col.key, row) }}</span>
          <span v-else-if="col.key === 'glCode'" class="tnum text-xs font-semibold">{{ row.glCode }}</span>
          <span v-else-if="col.key === 'product' || col.key === 'accountNo'" class="font-semibold text-ink text-xs">{{ cellVal(col.key, row) }}</span>
          <span v-else class="text-xs">{{ cellVal(col.key, row) }}</span>
        </template>
      </DataTable>
    </BaseCard>
  </div>
  <div v-else-if="pending" class="h-64 rounded-xl bg-surface border border-line animate-pulse" />
</template>
