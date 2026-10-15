<script setup lang="ts">
useHead({ title: 'Period Closures' })
const toast = useToast()
const api = useApi()
const { date } = useFormat()
const { data, refresh } = await useAsyncData('closures', () => $fetch<any>('/api/accounting/closures'))
const { data: refData } = await useAsyncData('meta-closures', () => $fetch<any>('/api/system/meta'))

const showNew = ref(false)
const busy = ref(false)
const form = reactive({ officeId: 1, closingDate: '', comments: '' })
async function create() {
  if (!form.closingDate) { toast.error('Pick a closing date'); return }
  busy.value = true
  try {
    const res: any = await api.post('/accounting/closures', form)
    toast.success('Period closed', res.message)
    showNew.value = false
    await refresh()
  } catch (e: any) { toast.error('Failed', e.message) } finally { busy.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="Accounting Period Closures" icon="check-circle"
      subtitle="Close the books per office/period — locked periods reject further postings.">
      <BaseButton size="sm" icon="plus" @click="showNew = true">Close Period</BaseButton>
    </PageHeader>

    <BaseCard :pad="false">
      <DataTable
        :columns="[
          { key: 'closingDate', label: 'Closed up to', sortable: true },
          { key: 'officeName', label: 'Office' },
          { key: 'createdDate', label: 'Created on' },
          { key: 'comments', label: 'Comments' },
          { key: 'status', label: 'Status', align: 'center' }]"
        :rows="data?.pageItems ?? []">
        <template #cell="{ col, row }">
          <span v-if="col.key === 'closingDate' || col.key === 'createdDate'" class="text-xs">{{ date(row[col.key]) }}</span>
          <span v-else-if="col.key === 'status'"><Badge size="sm" tone="green" dot>Closed</Badge></span>
          <span v-else class="text-xs">{{ row[col.key] }}</span>
        </template>
      </DataTable>
    </BaseCard>

    <ModalShell :open="showNew" title="Close Accounting Period" @close="showNew = false">
      <div class="space-y-4">
        <FormField label="Office">
          <SelectInput v-model="form.officeId" :options="refData?.offices ?? []" />
        </FormField>
        <FormField label="Closing date" required>
          <TextInput v-model="form.closingDate" type="date" />
        </FormField>
        <FormField label="Comments">
          <TextareaInput v-model="form.comments" :rows="2" placeholder="Reconciled and approved…" />
        </FormField>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="showNew = false">Cancel</BaseButton>
        <BaseButton size="sm" variant="success" :disabled="busy" @click="create">{{ busy ? 'Closing…' : 'Close books' }}</BaseButton>
      </template>
    </ModalShell>
  </div>
</template>
