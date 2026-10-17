<script setup lang="ts">
useHead({ title: 'Audit Trail' })
const { dateTime } = useFormat()

const entity = ref('')
const result = ref('')
const q = ref('')
const page = ref(1)
const { data } = useResource<any>('/system/audit', () => ({
  entity: entity.value, result: result.value, q: q.value, page: page.value, size: 25,
}))
watch([entity, result], () => { page.value = 1 })

const entities = ['Client', 'Loan', 'Savings', 'Journal Entry', 'Checker Task', 'User', 'GL Account', 'Staff', 'Office']
const iconFor = (e: string) => ({
  Client: 'user', Loan: 'credit-card', Savings: 'wallet', 'Journal Entry': 'document-text',
  'Checker Task': 'shield-check', User: 'users', 'GL Account': 'book-open', Staff: 'identification', Office: 'building-office',
} as Record<string, string>)[e] ?? 'document-text'
</script>

<template>
  <div>
    <PageHeader title="Audit Trail" icon="document-text"
      subtitle="Every maker/checker action across every module — immutable, with user and timestamp." />

    <BaseCard :pad="false">
      <template #header>
        <div class="px-5 pt-4 flex flex-wrap gap-3">
          <div class="w-40">
            <SelectInput v-model="entity" placeholder="All entities"
              :options="entities.map(e => ({ value: e, label: e }))" />
          </div>
          <div class="w-36">
            <SelectInput v-model="result" placeholder="Any result"
              :options="[{ value: 'success', label: 'Success' }, { value: 'failure', label: 'Failure' }]" />
          </div>
          <div class="relative flex-1 min-w-[200px]">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"><AppIcon name="magnifying-glass" :size="16" /></span>
            <input v-model="q" placeholder="Search user or record…"
              class="w-full pl-9 pr-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </template>

      <DataTable
        :columns="[
          { key: 'timestamp', label: 'When', sortable: true },
          { key: 'entity', label: 'Entity' },
          { key: 'action', label: 'Action' },
          { key: 'entityName', label: 'Record' },
          { key: 'userName', label: 'User' },
          { key: 'officeName', label: 'Office' },
          { key: 'result', label: 'Result', align: 'center' }]"
        :rows="data?.pageItems ?? []">
        <template #cell="{ col, row }">
          <span v-if="col.key === 'timestamp'" class="text-xs tnum text-ink-faint">{{ dateTime(row.timestamp) }}</span>
          <span v-else-if="col.key === 'entity'" class="flex items-center gap-2 text-xs font-medium">
            <AppIcon :name="iconFor(row.entity)" :size="14" class="text-primary" />{{ row.entity }}
          </span>
          <span v-else-if="col.key === 'action'" class="text-xs"><Badge size="sm" tone="gray">{{ row.action }}</Badge></span>
          <span v-else-if="col.key === 'entityName'" class="text-xs text-ink-soft">{{ row.entityName }}<span v-if="row.notes" class="text-ink-faint block text-[10px]">{{ row.notes }}</span></span>
          <span v-else-if="col.key === 'result'">
            <Badge size="sm" :tone="row.result === 'success' ? 'green' : 'red'" dot>{{ row.result }}</Badge>
          </span>
          <span v-else class="text-xs">{{ row[col.key] }}</span>
        </template>
      </DataTable>

      <template #footer>
        <Pagination :page="page" :size="25" :total="data?.totalFilteredCount ?? 0" @update:page="page = $event" />
      </template>
    </BaseCard>
  </div>
</template>
