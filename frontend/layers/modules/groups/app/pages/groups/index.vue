<script setup lang="ts">
useHead({ title: 'Groups' })
const { money, date } = useFormat()
const { meta } = useStatusMeta()

const q = ref('')
const page = ref(1)
const size = ref(20)
const { data, pending, refresh } = useResource<any>('/groups', () => ({ q: q.value, page: page.value, size: size.value }))
let t: any
watch(q, () => { page.value = 1; clearTimeout(t); t = setTimeout(refresh, 250) })

const columns = [
  { key: 'name', label: 'Group', sortable: true },
  { key: 'accountNo', label: 'Account #' },
  { key: 'officeName', label: 'Office' },
  { key: 'staffName', label: 'Field officer' },
  { key: 'meetingDay', label: 'Meets' },
  { key: 'memberCount', label: 'Members', align: 'center' as const },
  { key: 'portfolio', label: 'Portfolio', align: 'right' as const },
  { key: 'savings', label: 'Savings', align: 'right' as const },
  { key: 'status', label: 'Status', align: 'center' as const },
]
</script>

<template>
  <div>
    <PageHeader title="Groups & Centers" icon="user-group"
      subtitle="Solidarity groups for joint-liability lending and group savings (Fineract Groups).">
      <BaseButton variant="secondary" size="sm" icon="funnel">Centers view</BaseButton>
    </PageHeader>

    <BaseCard :pad="false">
      <template #header>
        <div class="px-5 pt-4 flex gap-3">
          <div class="relative flex-1 max-w-sm">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"><AppIcon name="magnifying-glass" :size="16" /></span>
            <input v-model="q" placeholder="Search groups…"
              class="w-full pl-9 pr-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </template>
      <DataTable :columns="columns" :rows="data?.pageItems ?? []" :loading="pending"
        @row-click="(r: any) => $router.push(`/groups/${r.id}`)">
        <template #cell="{ col, row }">
          <span v-if="col.key === 'name'" class="font-semibold text-ink">{{ row.name }}</span>
          <span v-else-if="col.key === 'portfolio' || col.key === 'savings'" class="tnum text-xs">{{ money(row[col.key]) }}</span>
          <span v-else-if="col.key === 'status'"><Badge :tone="meta(row.status).tone" dot>{{ meta(row.status).label }}</Badge></span>
          <span v-else-if="col.key === 'formationDate'">{{ date(row.formationDate) }}</span>
          <span v-else>{{ row[col.key] }}</span>
        </template>
      </DataTable>
      <template #footer>
        <Pagination :page="page" :size="size" :total="data?.totalFilteredCount ?? 0" @update:page="page = $event" />
      </template>
    </BaseCard>
  </div>
</template>
