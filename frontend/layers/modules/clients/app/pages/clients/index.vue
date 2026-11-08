<script setup lang="ts">
useHead({ title: 'Clients' })
const { money, date, num } = useFormat()
const { meta } = useStatusMeta()
const { data: refData } = await useAsyncData('meta-clients', () => $fetch<any>('/api/system/meta'))

const q = ref('')
const status = ref('')
const officeId = ref('')
const page = ref(1)
const size = ref(20)
let searchTimer: any

const { data, pending, refresh } = useResource<any>('/clients', () => ({
  q: q.value, status: status.value, officeId: officeId.value,
  page: page.value, size: size.value,
}))

watch([q, status, officeId], () => { page.value = 1; clearTimeout(searchTimer); searchTimer = setTimeout(refresh, 250) })

const columns = [
  { key: 'displayName', label: 'Client', sortable: true },
  { key: 'accountNo', label: 'Account #', sortable: true },
  { key: 'officeName', label: 'Office' },
  { key: 'staffName', label: 'Loan officer' },
  { key: 'accounts', label: 'Accounts', align: 'center' as const },
  { key: 'mobile', label: 'Mobile' },
  { key: 'activationDate', label: 'Activated', sortable: true },
  { key: 'status', label: 'Status', align: 'center' as const },
]
const rows = computed(() => (data.value?.pageItems ?? []).map((c: any) => ({ ...c, accounts: `${c.loanCount}L / ${c.savingsCount}S` })))

function reset() { q.value = ''; status.value = ''; officeId.value = '' }
</script>

<template>
  <div>
    <PageHeader title="Clients" icon="user" subtitle="Individual and business customers — KYC, accounts and relationships.">
      <BaseButton to="/clients/new" icon="plus" size="sm">New Client</BaseButton>
    </PageHeader>

    <BaseCard :pad="false">
      <template #actions>
        <BaseButton variant="ghost" size="sm" icon="arrow-path" @click="refresh">Refresh</BaseButton>
      </template>
      <template #header>
        <div class="px-5 pt-4 flex flex-wrap items-end gap-3">
          <div class="relative flex-1 min-w-[220px]">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"><AppIcon name="magnifying-glass" :size="16" /></span>
            <input v-model="q" placeholder="Search name, account no, mobile…"
              class="w-full pl-9 pr-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div class="w-44">
            <SelectInput v-model="status" placeholder="All statuses"
              :options="['active', 'pending', 'closed', 'transferred'].map(s => ({ value: s, label: meta(s).label }))" />
          </div>
          <div class="w-56">
            <SelectInput v-model="officeId" placeholder="All offices" :options="refData?.offices ?? []" />
          </div>
          <BaseButton variant="ghost" size="sm" @click="reset">Clear</BaseButton>
        </div>
      </template>

      <DataTable :columns="columns" :rows="rows" :loading="pending" row-key="id"
        empty="No clients match your filters."
        @row-click="(r: any) => $router.push(`/clients/${r.id}`)">
        <template #cell="{ col, row }">
          <div v-if="col.key === 'displayName'" class="flex items-center gap-3">
            <span class="w-9 h-9 rounded-full bg-primary-soft text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {{ (row.displayName || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2) }}
            </span>
            <div>
              <p class="font-semibold text-ink">{{ row.displayName }}</p>
              <p class="text-[11px] text-ink-faint">{{ row.clientType === 'business' ? 'Business' : 'Individual' }} · {{ row.externalId }}</p>
            </div>
          </div>
          <span v-else-if="col.key === 'accounts'" class="text-xs tnum text-ink-soft">{{ row.accounts }}</span>
          <span v-else-if="col.key === 'activationDate'" class="text-xs">{{ row.activationDate ? date(row.activationDate) : '—' }}</span>
          <span v-else-if="col.key === 'status'">
            <Badge :tone="meta(row.status).tone" dot>{{ meta(row.status).label }}</Badge>
          </span>
          <span v-else>{{ row[col.key] }}</span>
        </template>
      </DataTable>

      <template #footer>
        <Pagination :page="page" :size="size" :total="data?.totalFilteredCount ?? 0" @update:page="page = $event" />
      </template>
    </BaseCard>
  </div>
</template>
