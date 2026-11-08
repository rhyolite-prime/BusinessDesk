<script setup lang="ts">
useHead({ title: 'Reports' })
const { money } = useFormat()
const { meta } = useStatusMeta()
const { data: refData } = await useAsyncData('meta-reports', () => $fetch<any>('/api/system/meta'))

// ── Report catalogue with per-report parameter schema ─────────────────────
interface Param {
  key: string; label: string; type: 'date' | 'select';
  options?: { value: string; label: string }[]; placeholder?: string
}
interface ReportDef {
  key: string; name: string; category: string; description: string; icon: string
  params: Param[]
}

const reports: ReportDef[] = [
  { key: 'par', name: 'Portfolio at Risk (PAR > 30)', category: 'Loans', icon: 'exclamation-triangle',
    description: 'Overdue loans with days-past-due, exposure and at-risk amounts.',
    params: [
      { key: 'officeId', label: 'Branch / Office', type: 'select', options: refData.value?.offices ?? [] },
      { key: 'from', label: 'Disbursed from', type: 'date' },
      { key: 'to', label: 'Disbursed to', type: 'date' },
    ] },
  { key: 'collections', name: 'Collections Sheet', category: 'Loans', icon: 'banknotes',
    description: 'Expected vs collected installments per loan officer for the month.',
    params: [
      { key: 'officeId', label: 'Branch / Office', type: 'select', options: refData.value?.offices ?? [] },
    ] },
  { key: 'loan-portfolio', name: 'Loan Portfolio by Product', category: 'Loans', icon: 'cube',
    description: 'Disbursed, outstanding and arrears across every loan product.',
    params: [
      { key: 'officeId', label: 'Branch / Office', type: 'select', options: refData.value?.offices ?? [] },
      { key: 'from', label: 'Disbursed from', type: 'date' },
      { key: 'to', label: 'Disbursed to', type: 'date' },
    ] },
  { key: 'savings-portfolio', name: 'Savings Portfolio by Product', category: 'Savings', icon: 'wallet',
    description: 'Accounts, deposits, dormancy and pending per savings product.',
    params: [
      { key: 'officeId', label: 'Branch / Office', type: 'select', options: refData.value?.offices ?? [] },
    ] },
  { key: 'trial-balance', name: 'Trial Balance', category: 'Accounting', icon: 'book-open',
    description: 'GL debit and credit balances across the chart of accounts.',
    params: [
      { key: 'officeId', label: 'Branch / Office', type: 'select', options: refData.value?.offices ?? [] },
      { key: 'from', label: 'From date', type: 'date' },
      { key: 'to', label: 'To date', type: 'date' },
    ] },
  { key: 'branch-performance', name: 'Branch Performance', category: 'Organization', icon: 'building-office',
    description: 'Clients, portfolio and deposits by office.',
    params: [
      { key: 'officeId', label: 'Branch / Office', type: 'select', options: refData.value?.offices ?? [] },
    ] },
]
const categories = [...new Set(reports.map(r => r.category))]

const selectedKey = ref(reports[0].key)
const selected = computed(() => reports.find(r => r.key === selectedKey.value)!)
const paramValues = reactive<Record<string, string>>({})
const report = ref<any>(null)
const running = ref(false)

watch(selectedKey, () => { report.value = null; for (const k of Object.keys(paramValues)) delete paramValues[k] })

async function run() {
  running.value = true
  report.value = null
  try {
    const params: Record<string, string> = {}
    for (const p of selected.value.params) if (paramValues[p.key]) params[p.key] = paramValues[p.key]
    report.value = await $fetch(`/api/reports/${selected.value.key}`, { query: params })
  } catch (e: any) { report.value = { error: e?.data?.statusMessage ?? 'Report failed' } }
  finally { running.value = false }
}

// ── column/row rendering per report (mirrors server rows) ──
const columnDefs: Record<string, { key: string; label: string; align?: string; money?: boolean }[]> = {
  par: [
    { key: 'accountNo', label: 'Loan' }, { key: 'client', label: 'Client' }, { key: 'office', label: 'Branch' },
    { key: 'officer', label: 'Officer' }, { key: 'product', label: 'Product' },
    { key: 'outstanding', label: 'Outstanding', align: 'right', money: true },
    { key: 'overdue', label: 'Overdue', align: 'right', money: true }, { key: 'dpd', label: 'DPD', align: 'center' },
  ],
  collections: [
    { key: 'officer', label: 'Loan officer' }, { key: 'office', label: 'Branch' },
    { key: 'activeAccounts', label: 'Accounts', align: 'center' },
    { key: 'expected', label: 'Expected', align: 'right', money: true },
    { key: 'collected', label: 'Collected', align: 'right', money: true }, { key: 'rate', label: 'Rate', align: 'center' },
  ],
  'trial-balance': [
    { key: 'glCode', label: 'GL' }, { key: 'name', label: 'Account' }, { key: 'type', label: 'Type' },
    { key: 'debit', label: 'Debit', align: 'right', money: true }, { key: 'credit', label: 'Credit', align: 'right', money: true },
  ],
  'savings-portfolio': [
    { key: 'product', label: 'Code' }, { key: 'name', label: 'Product' }, { key: 'rate', label: 'Rate' },
    { key: 'accounts', label: 'Accounts', align: 'center' }, { key: 'active', label: 'Active', align: 'center' },
    { key: 'dormant', label: 'Dormant', align: 'center' }, { key: 'balance', label: 'Deposits', align: 'right', money: true },
  ],
  'loan-portfolio': [
    { key: 'product', label: 'Code' }, { key: 'name', label: 'Product' },
    { key: 'accounts', label: 'Active', align: 'center' },
    { key: 'disbursed', label: 'Disbursed', align: 'right', money: true },
    { key: 'outstanding', label: 'Outstanding', align: 'right', money: true },
    { key: 'overdue', label: 'Arrears', align: 'right', money: true },
  ],
  'branch-performance': [
    { key: 'office', label: 'Office' }, { key: 'clients', label: 'Clients', align: 'center' },
    { key: 'staff', label: 'Staff', align: 'center' }, { key: 'activeLoans', label: 'Loans', align: 'center' },
    { key: 'portfolio', label: 'Portfolio', align: 'right', money: true },
    { key: 'deposits', label: 'Deposits', align: 'right', money: true },
  ],
}
const cols = computed(() => columnDefs[selectedKey.value] ?? [])

function cellText(key: string, row: any) {
  if (key === 'rate' && typeof row.rate === 'number') return (row.rate * 100).toFixed(1) + '%'
  const v = row[key]
  return v ?? ''
}
function exportCsv() {
  if (!report.value?.rows?.length) return
  const c = cols.value
  const head = c.map(x => x.label).join(',')
  const lines = report.value.rows.map((r: any) => c.map(x => {
    let v: any = r[x.key]
    if (x.key === 'rate' && typeof v === 'number') v = (v * 100).toFixed(1) + '%'
    return `"${String(v ?? '').replace(/"/g, '""')}"`
  }).join(','))
  const csv = [head, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${selectedKey.value}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div>
    <PageHeader title="Reports &amp; Analytics" icon="chart-bar-square"
      subtitle="Fineract-style reports — choose a report, set its parameters, and run." />

    <div class="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
      <!-- Left: report type + parameters -->
      <BaseCard :pad="false">
        <div class="p-5 border-b border-line">
          <FormField label="Select Report Type">
            <select v-model="selectedKey"
              class="w-full rounded-lg border-2 border-primary/60 bg-white px-3 py-2.5 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/30">
              <optgroup v-for="cat in categories" :key="cat" :label="cat">
                <option v-for="r in reports.filter(x => x.category === cat)" :key="r.key" :value="r.key">{{ r.name }}</option>
              </optgroup>
            </select>
          </FormField>
          <p class="text-xs text-ink-faint mt-3 leading-relaxed">{{ selected.description }}</p>
        </div>

        <div class="p-5">
          <p class="text-xs font-bold uppercase tracking-wider text-ink mb-4">Report Parameters</p>
          <div class="space-y-4">
            <FormField v-for="p in selected.params" :key="p.key" :label="p.label">
              <TextInput v-if="p.type === 'date'" v-model="paramValues[p.key]" type="date" />
              <SelectInput v-else v-model="paramValues[p.key]" :options="[{ value: '', label: 'All' }, ...(p.options ?? [])]"
                placeholder="All" />
            </FormField>
          </div>

          <BaseButton block variant="primary" icon="arrow-path" class="mt-6" :disabled="running" @click="run">
            {{ running ? 'Running…' : 'Run Report' }}
          </BaseButton>
          <BaseButton block variant="secondary" icon="document-text" class="mt-2"
            :disabled="!report?.rows?.length" @click="exportCsv">
            Export CSV
          </BaseButton>
        </div>
      </BaseCard>

      <!-- Right: result area -->
      <BaseCard :pad="false" class="min-h-[520px]">
        <!-- Empty / ready state -->
        <div v-if="!report && !running" class="h-[520px] flex flex-col items-center justify-center text-center px-8 border-2 border-dashed border-line rounded-xl m-5">
          <span class="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
            <AppIcon :name="selected.icon" :size="30" />
          </span>
          <h3 class="text-lg font-semibold text-ink">{{ selected.name }} Ready</h3>
          <p class="text-sm text-ink-faint mt-2 max-w-sm leading-relaxed">
            {{ selected.description }} Click <strong>“Run Report”</strong> to process the data based on your selected parameters.
          </p>
        </div>

        <div v-else-if="running" class="h-[520px] flex items-center justify-center">
          <div class="text-center">
            <span class="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p class="text-sm text-ink-faint mt-3">Processing report…</p>
          </div>
        </div>

        <template v-else-if="report">
          <div class="p-5 border-b border-line flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="font-semibold text-ink flex items-center gap-2">
                <AppIcon :name="selected.icon" :size="17" class="text-primary" />{{ report.title }}
              </h3>
              <p class="text-[11px] text-ink-faint mt-0.5">
                Generated {{ new Date(report.generatedAt).toLocaleString('en-GB') }}
                <span v-if="paramValues.officeId"> · {{ refData?.offices.find((o: any) => String(o.value) === paramValues.officeId)?.label }}</span>
                <span v-if="paramValues.from || paramValues.to"> · {{ paramValues.from || '…' }} → {{ paramValues.to || '…' }}</span>
              </p>
            </div>
            <BaseButton size="sm" variant="secondary" icon="document-text" :disabled="!report.rows?.length" @click="exportCsv">Export CSV</BaseButton>
          </div>

          <div v-if="report.error" class="p-10 text-center text-sm text-red-600">{{ report.error }}</div>
          <template v-else>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 pb-0">
              <div v-for="s in report.summary" :key="s.label" class="rounded-xl bg-canvas px-4 py-3">
                <p class="text-[10px] uppercase tracking-wide text-ink-faint font-semibold">{{ s.label }}</p>
                <p class="text-base font-bold tnum mt-0.5">{{ s.value }}</p>
              </div>
            </div>

            <div class="p-5">
              <DataTable :columns="cols" :rows="report.rows ?? []">
                <template #cell="{ col, row }">
                  <span v-if="col.money" class="tnum font-medium"
                    :class="(col.key === 'overdue' && row.overdue > 0) ? 'text-red-600' : ''">{{ money(row[col.key]) }}</span>
                  <Badge v-else-if="col.key === 'dpd'" size="sm"
                    :tone="row.dpd >= 90 ? 'red' : row.dpd >= 30 ? 'amber' : 'blue'">{{ row.dpd }}d</Badge>
                  <span v-else-if="col.key === 'rate'" class="inline-flex font-semibold"
                    :class="row.rate >= 0.85 ? 'text-emerald-600' : row.rate >= 0.6 ? 'text-amber-600' : 'text-red-600'">{{ cellText('rate', row) }}</span>
                  <span v-else-if="col.key === 'glCode'" class="tnum text-xs font-semibold">{{ row.glCode }}</span>
                  <span v-else-if="col.key === 'product' || col.key === 'accountNo'" class="font-semibold text-ink text-xs">{{ cellText(col.key, row) }}</span>
                  <span v-else class="text-xs">{{ cellText(col.key, row) }}</span>
                </template>
              </DataTable>
            </div>
          </template>
        </template>
      </BaseCard>
    </div>
  </div>
</template>
