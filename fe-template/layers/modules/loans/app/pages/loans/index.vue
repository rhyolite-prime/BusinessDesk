<script setup lang="ts">
useHead({ title: 'Loan Accounts' })
const { money, date, num } = useFormat()
const { meta, loanStatus } = useStatusMeta()
const { data: refData } = await useAsyncData('meta-loans', () => $fetch<any>('/api/system/meta'))
const { data: prods } = await useAsyncData('lp-loans', () => $fetch<any>('/api/loan-products'))

const q = ref('')
const status = ref('')
const productId = ref('')
const overdueOnly = ref(false)
const page = ref(1)
const size = ref(20)

const { data, pending, refresh } = useResource<any>('/loans', () => ({
  q: q.value, status: status.value, productId: productId.value,
  overdue: overdueOnly.value ? 'true' : '', page: page.value, size: size.value,
}))
let t: any
watch([q, status, productId, overdueOnly], () => { page.value = 1; clearTimeout(t); t = setTimeout(refresh, 250) })

const columns = [
  { key: 'accountNo', label: 'Account', sortable: true },
  { key: 'clientName', label: 'Client' },
  { key: 'productName', label: 'Product' },
  { key: 'officeName', label: 'Office' },
  { key: 'principal', label: 'Principal', align: 'right' as const, sortable: true },
  { key: 'outstanding', label: 'Outstanding', align: 'right' as const, sortable: true },
  { key: 'submittedDate', label: 'Submitted', sortable: true },
  { key: 'status', label: 'Status', align: 'center' as const },
]
</script>

<template>
  <div>
    <PageHeader title="Loan Accounts" icon="credit-card"
      subtitle="Origination, approvals, disbursal, collections and write-offs across the book.">
      <BaseButton to="/loans/new" icon="plus" size="sm">New Loan</BaseButton>
    </PageHeader>

    <BaseCard :pad="false">
      <template #header>
        <div class="px-5 pt-4 flex flex-wrap items-end gap-3">
          <div class="relative flex-1 min-w-[220px]">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"><AppIcon name="magnifying-glass" :size="16" /></span>
            <input v-model="q" placeholder="Search account no or client…"
              class="w-full pl-9 pr-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div class="w-44">
            <SelectInput v-model="status" placeholder="All statuses"
              :options="['submitted', 'approved', 'active', 'closed', 'rejected', 'writtenoff'].map(s => ({ value: s, label: meta(s).label }))" />
          </div>
          <div class="w-52">
            <SelectInput v-model="productId" placeholder="All products"
              :options="(prods?.pageItems ?? []).map((p: any) => ({ value: p.id, label: p.name }))" />
          </div>
          <label class="flex items-center gap-2 text-xs font-medium text-ink-soft pb-2 cursor-pointer">
            <input v-model="overdueOnly" type="checkbox" class="w-4 h-4 rounded border-line accent-[var(--brand-primary)]" />
            Overdue only
          </label>
        </div>
      </template>

      <DataTable :columns="columns" :rows="data?.pageItems ?? []" :loading="pending"
        empty="No loan accounts match." @row-click="(r: any) => $router.push(`/loans/${r.id}`)">
        <template #cell="{ col, row }">
          <span v-if="col.key === 'accountNo'" class="font-semibold text-ink">{{ row.accountNo }}</span>
          <span v-else-if="col.key === 'clientName'" class="font-medium">{{ row.clientName }}</span>
          <span v-else-if="col.key === 'principal' || col.key === 'outstanding'"
            class="tnum" :class="col.key === 'outstanding' && row.overdueAmount > 0 ? 'text-red-600 font-semibold' : ''">
            {{ money(row[col.key]) }}
          </span>
          <span v-else-if="col.key === 'submittedDate'" class="text-xs">{{ date(row.submittedDate) }}</span>
          <span v-else-if="col.key === 'status'">
            <Badge :tone="loanStatus(row).tone" dot>{{ loanStatus(row).label }}</Badge>
          </span>
          <span v-else class="text-xs">{{ row[col.key] }}</span>
        </template>
      </DataTable>

      <template #footer>
        <Pagination :page="page" :size="size" :total="data?.totalFilteredCount ?? 0" @update:page="page = $event" />
      </template>
    </BaseCard>
  </div>
</template>
