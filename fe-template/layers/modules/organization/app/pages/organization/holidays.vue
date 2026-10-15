<script setup lang="ts">
useHead({ title: 'Holidays' })
const toast = useToast()
const api = useApi()
const { date } = useFormat()
const { data: refData } = await useAsyncData('meta-holidays', () => $fetch<any>('/api/system/meta'))
const { data, refresh } = await useAsyncData('holidays', () => $fetch<any>('/api/organization/holidays'))

const showNew = ref(false)
const busy = ref(false)
const form = reactive({ name: '', description: '', fromDate: '', toDate: '', officeId: 1 })
async function create() {
  if (!form.name || !form.fromDate) { toast.error('Name and date required'); return }
  busy.value = true
  try {
    const res: any = await api.post('/organization/holidays', { ...form, toDate: form.toDate || form.fromDate })
    toast.success('Holiday scheduled', res.message)
    showNew.value = false; form.name = ''
    await refresh()
  } catch (e: any) { toast.error('Failed', e.message) } finally { busy.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="Holidays" icon="calendar-days" subtitle="Non-working days respected by repayment schedules and SLAs.">
      <BaseButton size="sm" icon="plus" @click="showNew = true">New Holiday</BaseButton>
    </PageHeader>

    <BaseCard :pad="false">
      <DataTable
        :columns="[
          { key: 'name', label: 'Holiday' },
          { key: 'officeName', label: 'Applies to' },
          { key: 'fromDate', label: 'From', sortable: true },
          { key: 'toDate', label: 'To' },
          { key: 'description', label: 'Notes' },
          { key: 'status', label: 'Status', align: 'center' }]"
        :rows="data?.pageItems ?? []">
        <template #cell="{ col, row }">
          <span v-if="col.key === 'name'" class="font-semibold text-ink">{{ row.name }}</span>
          <span v-else-if="col.key === 'fromDate' || col.key === 'toDate'" class="text-xs">{{ date(row[col.key]) }}</span>
          <span v-else-if="col.key === 'status'"><Badge size="sm" tone="blue" dot>Active</Badge></span>
          <span v-else class="text-xs">{{ row[col.key] }}</span>
        </template>
      </DataTable>
    </BaseCard>

    <ModalShell :open="showNew" title="Schedule Holiday" @close="showNew = false">
      <div class="space-y-4">
        <FormField label="Holiday name" required><TextInput v-model="form.name" placeholder="e.g. Republic Day" /></FormField>
        <div class="grid grid-cols-2 gap-3">
          <FormField label="From" required><TextInput v-model="form.fromDate" type="date" /></FormField>
          <FormField label="To"><TextInput v-model="form.toDate" type="date" /></FormField>
        </div>
        <FormField label="Applies to office">
          <SelectInput v-model="form.officeId" :options="refData?.offices ?? []" />
        </FormField>
        <FormField label="Description"><TextareaInput v-model="form.description" :rows="2" /></FormField>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="showNew = false">Cancel</BaseButton>
        <BaseButton size="sm" :disabled="busy" @click="create">{{ busy ? 'Saving…' : 'Schedule' }}</BaseButton>
      </template>
    </ModalShell>
  </div>
</template>
