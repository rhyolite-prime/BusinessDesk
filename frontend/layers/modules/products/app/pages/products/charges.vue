<script setup lang="ts">
useHead({ title: 'Charges' })
const toast = useToast()
const api = useApi()
const { money } = useFormat()
const { data, refresh } = await useAsyncData('charges', () => $fetch<any>('/api/charges'))
const showNew = ref(false)
const busy = ref(false)
const form = reactive({ name: '', chargeType: 'fee', appliesTo: 'loan', amountMode: 'flat', amount: 10, due: 'specified' })
async function create() {
  if (!form.name) { toast.error('Name required'); return }
  busy.value = true
  try {
    const res: any = await api.post('/charges', form)
    toast.success('Charge created', res.message)
    showNew.value = false; form.name = ''
    await refresh()
  } catch (e: any) { toast.error('Failed', e.message) } finally { busy.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="Charges" icon="tag" subtitle="Fees and penalties applied to loans, savings accounts and clients.">
      <BaseButton size="sm" icon="plus" @click="showNew = true">New Charge</BaseButton>
    </PageHeader>

    <BaseCard :pad="false">
      <DataTable
        :columns="[
          { key: 'name', label: 'Charge', sortable: true },
          { key: 'appliesTo', label: 'Applies to' },
          { key: 'chargeType', label: 'Type' },
          { key: 'due', label: 'Due when' },
          { key: 'amount', label: 'Amount', align: 'right' },
          { key: 'active', label: 'Status', align: 'center' }]"
        :rows="data?.pageItems ?? []">
        <template #cell="{ col, row }">
          <span v-if="col.key === 'name'" class="font-semibold text-ink">{{ row.name }}</span>
          <span v-else-if="col.key === 'chargeType'"><Badge size="sm" :tone="row.chargeType === 'penalty' ? 'red' : 'blue'">{{ row.chargeType }}</Badge></span>
          <span v-else-if="col.key === 'amount'" class="tnum font-semibold">{{ row.amountMode === 'percent' ? row.amount + '%' : money(row.amount) }}</span>
          <span v-else-if="col.key === 'active'"><Badge size="sm" :tone="row.active ? 'green' : 'gray'" dot>{{ row.active ? 'Active' : 'Off' }}</Badge></span>
          <span v-else class="text-xs capitalize">{{ row[col.key] }}</span>
        </template>
      </DataTable>
    </BaseCard>

    <ModalShell :open="showNew" title="Create Charge" @close="showNew = false">
      <div class="space-y-4">
        <FormField label="Charge name" required><TextInput v-model="form.name" placeholder="e.g. SMS alert fee" /></FormField>
        <div class="grid grid-cols-2 gap-4">
          <FormField label="Applies to">
            <SelectInput v-model="form.appliesTo" :options="['loan', 'savings', 'client'].map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))" />
          </FormField>
          <FormField label="Type">
            <SelectInput v-model="form.chargeType" :options="[{ value: 'fee', label: 'Fee' }, { value: 'penalty', label: 'Penalty' }]" />
          </FormField>
          <FormField label="Calculation">
            <SelectInput v-model="form.amountMode" :options="[{ value: 'flat', label: 'Flat amount' }, { value: 'percent', label: 'Percentage' }]" />
          </FormField>
          <FormField :label="form.amountMode === 'percent' ? 'Percent (%)' : 'Amount (GH₵)'">
            <TextInput v-model.number="form.amount" type="number" />
          </FormField>
          <FormField label="Due when">
            <SelectInput v-model="form.due" :options="['disbursement', 'installment', 'monthly', 'withdrawal', 'specified'].map(v => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))" />
          </FormField>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="showNew = false">Cancel</BaseButton>
        <BaseButton size="sm" :disabled="busy" @click="create">{{ busy ? 'Creating…' : 'Create charge' }}</BaseButton>
      </template>
    </ModalShell>
  </div>
</template>
