<script setup lang="ts">
useHead({ title: 'Savings Accounts' })
const toast = useToast()
const api = useApi()
const { money, date } = useFormat()
const { meta } = useStatusMeta()
const { data: prods } = await useAsyncData('sp-list', () => $fetch<any>('/api/savings-products'))
const { data: clients } = await useAsyncData('cl-for-savings', () => $fetch<any>('/api/clients', { query: { status: 'active', size: 200 } }))

const q = ref('')
const status = ref('')
const productId = ref('')
const page = ref(1)
const size = ref(20)
const { data, pending, refresh } = useResource<any>('/savings', () => ({
  q: q.value, status: status.value, productId: productId.value, page: page.value, size: size.value,
}))
let t: any
watch([q, status, productId], () => { page.value = 1; clearTimeout(t); t = setTimeout(refresh, 250) })

// new account modal
const showNew = ref(false)
const form = reactive({ clientId: '', productId: '' })
const busy = ref(false)
async function createAccount() {
  if (!form.clientId || !form.productId) { toast.error('Select client and product'); return }
  busy.value = true
  try {
    const res: any = await api.post('/savings', form)
    toast.success('Account opened', res.message)
    showNew.value = false
    form.clientId = ''; form.productId = ''
    await refresh()
  } catch (e: any) { toast.error('Failed', e.message) } finally { busy.value = false }
}

const columns = [
  { key: 'accountNo', label: 'Account', sortable: true },
  { key: 'clientName', label: 'Client' },
  { key: 'productName', label: 'Product' },
  { key: 'officeName', label: 'Office' },
  { key: 'interestRate', label: 'Rate', align: 'center' as const },
  { key: 'balance', label: 'Balance', align: 'right' as const, sortable: true },
  { key: 'submittedDate', label: 'Opened', sortable: true },
  { key: 'status', label: 'Status', align: 'center' as const },
]
</script>

<template>
  <div>
    <PageHeader title="Savings Accounts" icon="wallet"
      subtitle="Deposits, withdrawals, fixed deposits and susu accounts across all branches.">
      <BaseButton size="sm" icon="plus" @click="showNew = true">Open Account</BaseButton>
    </PageHeader>

    <BaseCard :pad="false">
      <template #header>
        <div class="px-5 pt-4 flex flex-wrap items-end gap-3">
          <div class="relative flex-1 min-w-[220px]">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"><AppIcon name="magnifying-glass" :size="16" /></span>
            <input v-model="q" placeholder="Search account no or client…"
              class="w-full pl-9 pr-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div class="w-44">
            <SelectInput v-model="status" placeholder="All statuses"
              :options="['submitted', 'approved', 'active', 'dormant', 'closed'].map(s => ({ value: s, label: meta(s).label }))" />
          </div>
          <div class="w-52">
            <SelectInput v-model="productId" placeholder="All products"
              :options="(prods?.pageItems ?? []).map((p: any) => ({ value: p.id, label: p.name }))" />
          </div>
        </div>
      </template>

      <DataTable :columns="columns" :rows="data?.pageItems ?? []" :loading="pending"
        @row-click="(r: any) => $router.push(`/savings/${r.id}`)">
        <template #cell="{ col, row }">
          <span v-if="col.key === 'accountNo'" class="font-semibold text-ink">{{ row.accountNo }}</span>
          <span v-else-if="col.key === 'clientName'" class="font-medium">{{ row.clientName }}</span>
          <span v-else-if="col.key === 'balance'" class="tnum font-semibold" :class="row.balance > 0 ? 'text-emerald-700' : 'text-ink-faint'">{{ money(row.balance) }}</span>
          <span v-else-if="col.key === 'interestRate'" class="text-xs tnum">{{ row.interestRate }}%</span>
          <span v-else-if="col.key === 'submittedDate'" class="text-xs">{{ date(row.activatedDate || row.submittedDate) }}</span>
          <span v-else-if="col.key === 'status'"><Badge :tone="meta(row.status).tone" dot>{{ meta(row.status).label }}</Badge></span>
          <span v-else class="text-xs">{{ row[col.key] }}</span>
        </template>
      </DataTable>

      <template #footer>
        <Pagination :page="page" :size="size" :total="data?.totalFilteredCount ?? 0" @update:page="page = $event" />
      </template>
    </BaseCard>

    <!-- New savings account -->
    <ModalShell :open="showNew" title="Open Savings Account" subtitle="Account starts in submitted state and goes through approval → activation." @close="showNew = false">
      <div class="space-y-4">
        <FormField label="Client" required>
          <SelectInput v-model="form.clientId" placeholder="Select client…"
            :options="(clients?.pageItems ?? []).map((c: any) => ({ value: c.id, label: `${c.displayName} (${c.accountNo})` }))" />
        </FormField>
        <FormField label="Savings product" required>
          <SelectInput v-model="form.productId" placeholder="Select product…"
            :options="(prods?.pageItems ?? []).filter((p: any) => p.active).map((p: any) => ({ value: p.id, label: `${p.name} — ${p.interestRate}% p.a., min GH₵${p.minOpeningBalance}` }))" />
        </FormField>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="showNew = false">Cancel</BaseButton>
        <BaseButton size="sm" icon="check" :disabled="busy" @click="createAccount">{{ busy ? 'Opening…' : 'Open account' }}</BaseButton>
      </template>
    </ModalShell>
  </div>
</template>
