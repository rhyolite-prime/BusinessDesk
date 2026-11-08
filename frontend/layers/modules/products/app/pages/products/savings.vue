<script setup lang="ts">
useHead({ title: 'Savings Products' })
const toast = useToast()
const api = useApi()
const { money } = useFormat()

const { data, refresh } = await useAsyncData('sav-prods', () => $fetch<any>('/api/savings-products'))
const showNew = ref(false)
const busy = ref(false)
const form = reactive({ name: '', shortName: '', description: '', type: 'savings', interestRate: 4, minOpeningBalance: 20, withdrawalFee: 0, lockinDays: 0 })
async function create() {
  if (!form.name) { toast.error('Name required'); return }
  busy.value = true
  try {
    const res: any = await api.post('/savings-products', form)
    toast.success('Product created', res.message)
    showNew.value = false; form.name = ''
    await refresh()
  } catch (e: any) { toast.error('Failed', e.message) } finally { busy.value = false }
}
const typeLabel: Record<string, string> = { savings: 'Savings', current: 'Current', fixed: 'Fixed deposit', recurring: 'Recurring' }
</script>

<template>
  <div>
    <PageHeader title="Savings Products" icon="wallet" subtitle="Deposit products — susu, current, fixed and recurring deposits.">
      <BaseButton size="sm" icon="plus" @click="showNew = true">New Product</BaseButton>
    </PageHeader>

    <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      <BaseCard v-for="p in data?.pageItems ?? []" :key="p.id">
        <template #actions>
          <Badge tone="blue">{{ typeLabel[p.type] }}</Badge>
        </template>
        <div class="flex items-start gap-3">
          <span class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">{{ p.shortName }}</span>
          <div>
            <h3 class="font-semibold text-ink text-sm">{{ p.name }}</h3>
            <p class="text-xs text-ink-faint mt-1 leading-relaxed line-clamp-2">{{ p.description }}</p>
          </div>
        </div>
        <dl class="grid grid-cols-2 gap-3 mt-4 text-xs">
          <div><p class="text-ink-faint">Interest p.a.</p><p class="font-semibold tnum">{{ p.interestRate }}%</p></div>
          <div><p class="text-ink-faint">Min. opening</p><p class="font-semibold tnum">{{ money(p.minOpeningBalance) }}</p></div>
          <div><p class="text-ink-faint">Withdrawal fee</p><p class="font-semibold tnum">{{ money(p.withdrawalFee) }}</p></div>
          <div><p class="text-ink-faint">Lock-in</p><p class="font-semibold tnum">{{ p.lockinDays }} days</p></div>
        </dl>
        <div class="flex justify-between mt-4 pt-3 border-t border-line text-xs">
          <span class="text-ink-faint">{{ p.activeAccounts }} open accounts</span>
          <span class="font-semibold tnum">{{ money(p.deposits) }} deposits</span>
        </div>
      </BaseCard>
    </div>

    <ModalShell :open="showNew" title="Create Savings Product" @close="showNew = false" width="max-w-xl">
      <div class="grid sm:grid-cols-2 gap-4">
        <FormField label="Product name" required><TextInput v-model="form.name" /></FormField>
        <FormField label="Short name"><TextInput v-model="form.shortName" /></FormField>
        <div class="sm:col-span-2"><FormField label="Description"><TextareaInput v-model="form.description" :rows="2" /></FormField></div>
        <FormField label="Type">
          <SelectInput v-model="form.type" :options="Object.entries(typeLabel).map(([value, label]) => ({ value, label }))" />
        </FormField>
        <FormField label="Interest % p.a."><TextInput v-model.number="form.interestRate" type="number" /></FormField>
        <FormField label="Min opening balance"><TextInput v-model.number="form.minOpeningBalance" type="number" /></FormField>
        <FormField label="Withdrawal fee"><TextInput v-model.number="form.withdrawalFee" type="number" /></FormField>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="showNew = false">Cancel</BaseButton>
        <BaseButton size="sm" :disabled="busy" @click="create">{{ busy ? 'Creating…' : 'Create product' }}</BaseButton>
      </template>
    </ModalShell>
  </div>
</template>
