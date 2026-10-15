<script setup lang="ts">
useHead({ title: 'New Loan' })
const toast = useToast()
const api = useApi()
const router = useRouter()
const route = useRoute()
const { money } = useFormat()

const { data: clients } = await useAsyncData('clients-new-loan', () => $fetch<any>('/api/clients', { query: { status: 'active', size: 200 } }))
const { data: prods } = await useAsyncData('prods-new-loan', () => $fetch<any>('/api/loan-products'))

const form = reactive({
  clientId: route.query.client ?? '',
  productId: '',
  principal: null as number | null,
  term: null as number | null,
  purpose: 'Working capital',
  collateral: 'Two guarantors',
  guarantor: '',
})
const saving = ref(false)

const clientOptions = computed(() => (clients.value?.pageItems ?? []).map((c: any) => ({ value: c.id, label: `${c.displayName} (${c.accountNo})` })))
const product = computed(() => (prods.value?.pageItems ?? []).find((p: any) => p.id === Number(form.productId)))

watch(product, (p) => {
  if (p) { form.principal = Math.round(p.principalMin * 1.5); form.term = p.termMin }
})

const periods = computed(() => {
  const p = product.value
  if (!p || !form.term) return 0
  return Math.max(2, Math.round(form.term / p.repayEvery))
})
const installment = computed(() => {
  const p = product.value
  if (!p || !form.principal || !periods.value) return 0
  const per = p.repayFrequency === 'months' ? 0.06 / 12 : 0.06 / 52 // preview uses ~6%
  const r = (p.interestRateMin / 100) / (p.repayFrequency === 'months' ? 12 : 52)
  void per
  const inst = (form.principal * r) / (1 - Math.pow(1 + r, -periods.value))
  return Math.round(inst)
})
const totalRepayable = computed(() => installment.value * periods.value)

async function submit() {
  if (!form.clientId || !form.productId || !form.principal) { toast.error('Complete client, product and principal'); return }
  saving.value = true
  try {
    const res: any = await api.post('/loans', form)
    toast.success('Loan submitted', res.message)
    router.push(`/loans/${res.data.id}`)
  } catch (e: any) { toast.error('Submission failed', e.message) } finally { saving.value = false }
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <PageHeader title="Originate Loan" icon="credit-card" subtitle="New loan application — enters the maker-checker queue as submitted." />

    <div class="grid lg:grid-cols-3 gap-4">
      <BaseCard class="lg:col-span-2">
        <div class="space-y-4">
          <FormField label="Client" required>
            <SelectInput v-model="form.clientId" placeholder="Select active client…" :options="clientOptions" />
          </FormField>
          <FormField label="Loan product" required>
            <SelectInput v-model="form.productId" placeholder="Select product…"
              :options="(prods?.pageItems ?? []).filter((p: any) => p.active).map((p: any) => ({ value: p.id, label: p.name }))" />
          </FormField>

          <div v-if="product" class="rounded-xl bg-primary-soft p-4 text-sm space-y-2">
            <p class="font-semibold text-primary">{{ product.name }}</p>
            <p class="text-ink-soft text-xs leading-relaxed">{{ product.description }}</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div><p class="text-[10px] uppercase text-ink-faint">Principal range</p><p class="font-semibold tnum">{{ money(product.principalMin) }}–{{ money(product.principalMax) }}</p></div>
              <div><p class="text-[10px] uppercase text-ink-faint">Interest</p><p class="font-semibold tnum">{{ product.interestRateMin }}–{{ product.interestRateMax }}% p.a.</p></div>
              <div><p class="text-[10px] uppercase text-ink-faint">Term</p><p class="font-semibold tnum">{{ product.termMin }}–{{ product.termMax }} {{ product.termFrequency }}</p></div>
              <div><p class="text-[10px] uppercase text-ink-faint">Repayment</p><p class="font-semibold">Every {{ product.repayEvery }} {{ product.repayFrequency }}</p></div>
            </div>
          </div>

          <div class="grid sm:grid-cols-2 gap-4">
            <FormField :label="product ? `Principal (max ${money(product.principalMax)})` : 'Principal'" required>
              <TextInput v-model.number="form.principal" type="number" />
            </FormField>
            <FormField :label="product ? `Term (${product.termFrequency})` : 'Term'" required>
              <TextInput v-model.number="form.term" type="number" />
            </FormField>
            <FormField label="Purpose">
              <TextInput v-model="form.purpose" />
            </FormField>
            <FormField label="Guarantor">
              <TextInput v-model="form.guarantor" placeholder="Name (relationship)" />
            </FormField>
          </div>
          <FormField label="Collateral / security">
            <TextInput v-model="form.collateral" />
          </FormField>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <BaseButton variant="secondary" to="/loans">Cancel</BaseButton>
            <BaseButton icon="check" :disabled="saving" @click="submit">{{ saving ? 'Submitting…' : 'Submit for approval' }}</BaseButton>
          </div>
        </template>
      </BaseCard>

      <BaseCard title="Schedule preview" icon="calendar-days">
        <EmptyState v-if="!product" title="Pick a product" message="Installment preview appears here." />
        <dl v-else class="space-y-3 text-sm">
          <div class="flex justify-between"><dt class="text-ink-faint">Installments</dt><dd class="font-semibold tnum">{{ periods }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-faint">Per installment</dt><dd class="font-semibold tnum text-primary">{{ money(installment) }}</dd></div>
          <div class="flex justify-between border-t border-line pt-3"><dt class="text-ink-faint">Total repayable</dt><dd class="font-bold tnum">{{ money(totalRepayable) }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-faint">Interest (est.)</dt><dd class="tnum">{{ money(totalRepayable - (form.principal ?? 0)) }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-faint">Frequency</dt><dd>Every {{ product.repayEvery }} {{ product.repayFrequency }}</dd></div>
        </dl>
      </BaseCard>
    </div>
  </div>
</template>
