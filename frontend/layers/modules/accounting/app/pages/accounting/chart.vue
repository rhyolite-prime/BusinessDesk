<script setup lang="ts">
useHead({ title: 'Chart of Accounts' })
const toast = useToast()
const api = useApi()
const { money } = useFormat()
const { data, refresh } = await useAsyncData('coa', () => $fetch<any>('/api/accounting/accounts'))

const typeMeta: Record<string, { label: string; tone: any }> = {
  ASSET: { label: 'Assets', tone: 'blue' },
  LIABILITY: { label: 'Liabilities', tone: 'purple' },
  EQUITY: { label: 'Equity', tone: 'amber' },
  INCOME: { label: 'Income', tone: 'green' },
  EXPENSE: { label: 'Expenses', tone: 'red' },
}
const groups = computed(() => {
  const items = data.value?.pageItems ?? []
  return Object.keys(typeMeta).map(type => ({
    type, ...typeMeta[type],
    header: items.filter(a => a.type === type && a.usage === 'header'),
    details: items.filter(a => a.type === type && a.usage === 'detail'),
  }))
})

const showNew = ref(false)
const busy = ref(false)
const form = reactive({ glCode: '', name: '', type: 'ASSET', usage: 'detail', description: '' })
async function create() {
  if (!form.glCode || !form.name) { toast.error('Code and name required'); return }
  busy.value = true
  try {
    const res: any = await api.post('/accounting/accounts', form)
    toast.success('GL account created', res.message)
    showNew.value = false
    await refresh()
  } catch (e: any) { toast.error('Failed', e.message) } finally { busy.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="Chart of Accounts" icon="book-open"
      subtitle="The general ledger — balances are posted live by every loan, savings and journal action.">
      <BaseButton size="sm" icon="plus" @click="showNew = true">New GL Account</BaseButton>
    </PageHeader>

    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
      <div v-for="(t, i) in [
        ['assets', data?.totals?.assets, 'blue'], ['liabilities', data?.totals?.liabilities, 'purple'],
        ['equity', data?.totals?.equity, 'amber'], ['income', data?.totals?.income, 'green'],
        ['expenses', data?.totals?.expenses, 'red']]" :key="i"
        class="bg-surface border border-line rounded-xl px-4 py-3">
        <p class="text-[10px] uppercase tracking-wide text-ink-faint font-semibold">{{ t[0] }}</p>
        <p class="text-sm font-bold tnum mt-1">{{ money(t[1] ?? 0) }}</p>
      </div>
    </div>

    <div class="grid xl:grid-cols-2 gap-4">
      <BaseCard v-for="g in groups" :key="g.type" :pad="false">
        <template #header>
          <div class="px-5 py-4 border-b border-line flex items-center justify-between">
            <h3 class="text-sm font-semibold flex items-center gap-2">
              <Badge :tone="g.tone">{{ g.label }}</Badge>
            </h3>
          </div>
        </template>
        <ul class="divide-y divide-line/60">
          <li v-for="a in [...g.header, ...g.details]" :key="a.id"
            class="px-5 py-2.5 flex items-center gap-3" :class="a.usage === 'header' ? 'bg-canvas/60' : ''">
            <span class="tnum text-xs text-ink-faint w-12">{{ a.glCode }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm truncate" :class="a.usage === 'header' ? 'font-semibold text-ink' : 'text-ink-soft pl-3'">
                {{ a.usage === 'detail' ? '└ ' : '' }}{{ a.name }}
              </p>
            </div>
            <span v-if="a.usage === 'detail'" class="text-xs tnum font-semibold"
              :class="a.balance === 0 ? 'text-ink-faint' : 'text-ink'">{{ money(Math.abs(a.balance)) }}</span>
          </li>
        </ul>
      </BaseCard>
    </div>

    <ModalShell :open="showNew" title="New GL Account" @close="showNew = false">
      <div class="space-y-4">
        <div class="grid grid-cols-3 gap-3">
          <FormField label="GL code" required><TextInput v-model="form.glCode" placeholder="5700" /></FormField>
          <div class="col-span-2"><FormField label="Account name" required><TextInput v-model="form.name" placeholder="Travel & transport" /></FormField></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <FormField label="Type">
            <SelectInput v-model="form.type" :options="Object.keys(typeMeta).map(t => ({ value: t, label: typeMeta[t].label }))" />
          </FormField>
          <FormField label="Usage">
            <SelectInput v-model="form.usage" :options="[{ value: 'header', label: 'Header' }, { value: 'detail', label: 'Detail (postable)' }]" />
          </FormField>
        </div>
        <FormField label="Description"><TextareaInput v-model="form.description" :rows="2" /></FormField>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="showNew = false">Cancel</BaseButton>
        <BaseButton size="sm" :disabled="busy" @click="create">{{ busy ? 'Creating…' : 'Create account' }}</BaseButton>
      </template>
    </ModalShell>
  </div>
</template>
