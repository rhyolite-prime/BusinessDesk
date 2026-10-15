<script setup lang="ts">
useHead({ title: 'Loan Products' })
const toast = useToast()
const api = useApi()
const { money, pct } = useFormat()

const { data, refresh } = await useAsyncData('loan-prods', () => $fetch<any>('/api/loan-products'))
const showNew = ref(false)
const busy = ref(false)
const form = reactive({
  name: '', shortName: '', description: '',
  principalMin: 500, principalMax: 10000,
  interestRateMin: 8, interestRateMax: 24,
  termMin: 6, termMax: 24, termFrequency: 'months',
  repayEvery: 1, repayFrequency: 'months', graceOnPrincipal: 0,
})
async function create() {
  if (!form.name) { toast.error('Name required'); return }
  busy.value = true
  try {
    const res: any = await api.post('/loan-products', form)
    toast.success('Product created', res.message)
    showNew.value = false; form.name = ''
    await refresh()
  } catch (e: any) { toast.error('Failed', e.message) } finally { busy.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="Loan Products" icon="banknotes" subtitle="Credit products with principal, interest and term policy.">
      <BaseButton size="sm" icon="plus" @click="showNew = true">New Product</BaseButton>
    </PageHeader>

    <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      <BaseCard v-for="p in data?.pageItems ?? []" :key="p.id">
        <template #actions><Badge :tone="p.active ? 'green' : 'gray'" dot>{{ p.active ? 'Active' : 'Disabled' }}</Badge></template>
        <div class="flex items-start gap-3">
          <span class="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center font-bold text-xs shrink-0">{{ p.shortName }}</span>
          <div class="min-w-0">
            <h3 class="font-semibold text-ink text-sm">{{ p.name }}</h3>
            <p class="text-xs text-ink-faint mt-1 leading-relaxed line-clamp-2">{{ p.description }}</p>
          </div>
        </div>
        <dl class="grid grid-cols-2 gap-3 mt-4 text-xs">
          <div><p class="text-ink-faint">Principal</p><p class="font-semibold tnum">{{ money(p.principalMin) }}–{{ money(p.principalMax) }}</p></div>
          <div><p class="text-ink-faint">Interest p.a.</p><p class="font-semibold tnum">{{ p.interestRateMin }}–{{ p.interestRateMax }}%</p></div>
          <div><p class="text-ink-faint">Term</p><p class="font-semibold tnum">{{ p.termMin }}–{{ p.termMax }} {{ p.termFrequency }}</p></div>
          <div><p class="text-ink-faint">Repayment</p><p class="font-semibold">Every {{ p.repayEvery }} {{ p.repayFrequency }}</p></div>
        </dl>
        <div class="flex justify-between mt-4 pt-3 border-t border-line text-xs">
          <span class="text-ink-faint">{{ p.activeLoans }} active loans</span>
          <span class="font-semibold tnum">{{ money(p.outstanding) }} outstanding</span>
        </div>
      </BaseCard>
    </div>

    <ModalShell :open="showNew" title="Create Loan Product" @close="showNew = false" width="max-w-2xl">
      <div class="grid sm:grid-cols-2 gap-4">
        <FormField label="Product name" required><TextInput v-model="form.name" placeholder="Market Trader Loan" /></FormField>
        <FormField label="Short name"><TextInput v-model="form.shortName" placeholder="MTL" /></FormField>
        <div class="sm:col-span-2"><FormField label="Description"><TextareaInput v-model="form.description" :rows="2" /></FormField></div>
        <FormField label="Min principal"><TextInput v-model.number="form.principalMin" type="number" /></FormField>
        <FormField label="Max principal"><TextInput v-model.number="form.principalMax" type="number" /></FormField>
        <FormField label="Min interest % p.a."><TextInput v-model.number="form.interestRateMin" type="number" /></FormField>
        <FormField label="Max interest % p.a."><TextInput v-model.number="form.interestRateMax" type="number" /></FormField>
        <FormField label="Min term"><TextInput v-model.number="form.termMin" type="number" /></FormField>
        <FormField label="Max term"><TextInput v-model.number="form.termMax" type="number" /></FormField>
        <FormField label="Term unit"><SelectInput v-model="form.termFrequency" :options="[{ value: 'months', label: 'Months' }, { value: 'weeks', label: 'Weeks' }]" /></FormField>
        <FormField label="Repay every (n)"><TextInput v-model.number="form.repayEvery" type="number" /></FormField>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="showNew = false">Cancel</BaseButton>
        <BaseButton size="sm" :disabled="busy" @click="create">{{ busy ? 'Creating…' : 'Create product' }}</BaseButton>
      </template>
    </ModalShell>
  </div>
</template>
