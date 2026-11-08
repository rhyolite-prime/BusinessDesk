<script setup lang="ts">
useHead({ title: 'Savings Account' })
const route = useRoute()
const toast = useToast()
const api = useApi()
const { money, date } = useFormat()
const { meta } = useStatusMeta()

const { data: acc, pending, refresh } = await useAsyncData('savings-' + route.params.id,
  () => $fetch<any>(`/api/savings/${route.params.id}`))

const tab = ref('ledger')
const action = ref<null | 'approve' | 'activate' | 'deposit' | 'withdraw' | 'close'>(null)
const form = reactive({ amount: null as number | null, paymentType: 'Cash', note: '' })
const busy = ref(false)

const cfg = {
  approve: { title: 'Approving account — no money moves', btn: 'Approve', tone: 'primary' as const },
  activate: { title: 'Activate with opening deposit', btn: 'Activate account', tone: 'success' as const },
  deposit: { title: 'Post Deposit', btn: 'Deposit', tone: 'success' as const },
  withdraw: { title: 'Post Withdrawal', btn: 'Withdraw', tone: 'primary' as const },
  close: { title: 'Close Account', btn: 'Close account', tone: 'danger' as const },
}

async function submit() {
  if (!action.value) return
  busy.value = true
  try {
    const res: any = await api.post(`/savings/${route.params.id}/${action.value}`, { ...form })
    toast.success('Done', res.message)
    action.value = null; form.amount = null
    await refresh()
  } catch (e: any) { toast.error('Action failed', e.message) } finally { busy.value = false }
}

function openWith(a: typeof action.value) {
  form.amount = null; form.paymentType = 'Cash'; form.note = ''
  action.value = a
}

const txnIcon = (t: string) => t === 'deposit' ? 'arrow-trending-down' : t === 'withdrawal' ? 'arrow-trending-up' : t === 'interest' ? 'sparkles' : 'tag'
const txnTone = (t: string) => t === 'deposit' || t === 'interest' ? 'text-emerald-600' : t === 'withdrawal' ? 'text-red-600' : 'text-amber-600'
</script>

<template>
  <div v-if="acc">
    <div class="flex flex-wrap items-start justify-between gap-4 mb-5">
      <div class="min-w-0">
        <p class="text-xs text-ink-faint mb-1 flex items-center gap-1">
          <NuxtLink to="/savings" class="hover:text-primary">Savings</NuxtLink>
          <AppIcon name="chevron-right" :size="12" />
          <NuxtLink :to="`/clients/${acc.clientId}`" class="hover:text-primary">{{ acc.clientName }}</NuxtLink>
        </p>
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-xl font-bold text-ink">{{ acc.accountNo }}</h1>
          <Badge :tone="meta(acc.status).tone" dot>{{ meta(acc.status).label }}</Badge>
          <Badge tone="gray">{{ acc.productName }}</Badge>
        </div>
        <p class="text-sm text-ink-faint mt-1">{{ acc.officeName }} · {{ acc.interestRate }}% p.a. · opened by {{ acc.staffName }}</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <BaseButton v-if="acc.status === 'submitted'" size="sm" variant="success" icon="check-circle" @click="openWith('approve')">Approve</BaseButton>
        <BaseButton v-if="acc.status === 'approved'" size="sm" variant="success" icon="check" @click="openWith('activate')">Activate & deposit</BaseButton>
        <template v-if="acc.status === 'active' || acc.status === 'dormant'">
          <BaseButton size="sm" variant="success" icon="arrow-trending-down" @click="openWith('deposit')">Deposit</BaseButton>
          <BaseButton size="sm" variant="secondary" icon="arrow-trending-up" @click="openWith('withdraw')">Withdraw</BaseButton>
          <BaseButton size="sm" variant="danger" icon="x-mark" @click="openWith('close')">Close</BaseButton>
        </template>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard label="Available balance" :value="money(acc.balance)" icon="wallet" tone="green" />
      <StatCard label="Total deposits" :value="money(acc.totalDeposits)" icon="arrow-trending-down" tone="primary" />
      <StatCard label="Total withdrawals" :value="money(acc.totalWithdrawals)" icon="arrow-trending-up" tone="amber" />
      <StatCard label="Interest rate" :value="acc.interestRate + '% p.a.'" icon="sparkles" tone="purple"
        :hint="acc.activatedDate ? 'Active since ' + date(acc.activatedDate) : 'Not yet active'" />
    </div>

    <Tabs v-model="tab" :tabs="[
      { key: 'ledger', label: 'Transactions', icon: 'list-bullet', count: acc.transactions.length },
      { key: 'details', label: 'Account Details', icon: 'document-text' },
    ]" />

    <div class="mt-5">
      <BaseCard v-if="tab === 'ledger'" :pad="false">
        <EmptyState v-if="!acc.transactions.length" icon="wallet" title="No transactions yet"
          message="Approved accounts are activated with an opening deposit." />
        <ul v-else class="divide-y divide-line">
          <li v-for="t in acc.transactions" :key="t.id" class="flex items-center gap-4 px-5 py-3">
            <span class="w-9 h-9 rounded-full bg-canvas flex items-center justify-center shrink-0" :class="txnTone(t.type)">
              <AppIcon :name="txnIcon(t.type)" :size="16" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-ink capitalize">{{ t.type }}<span v-if="t.note" class="text-ink-faint font-normal"> — {{ t.note }}</span></p>
              <p class="text-[11px] text-ink-faint">{{ date(t.date) }} · {{ t.paymentType }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm font-bold tnum" :class="t.type === 'withdrawal' || t.type === 'fee' ? 'text-red-600' : 'text-emerald-700'">
                {{ t.type === 'withdrawal' || t.type === 'fee' ? '−' : '+' }}{{ money(t.amount, true) }}
              </p>
              <p class="text-[10px] text-ink-faint tnum">Bal {{ money(t.balanceAfter) }}</p>
            </div>
          </li>
        </ul>
      </BaseCard>

      <BaseCard v-else title="Account details" icon="document-text">
        <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm max-w-2xl">
          <div class="flex justify-between"><dt class="text-ink-faint">Client</dt><dd><NuxtLink :to="`/clients/${acc.clientId}`" class="text-primary font-medium">{{ acc.clientName }}</NuxtLink></dd></div>
          <div class="flex justify-between"><dt class="text-ink-faint">Product</dt><dd class="font-medium">{{ acc.productName }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-faint">Submitted</dt><dd>{{ date(acc.submittedDate) }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-faint">Approved</dt><dd>{{ acc.approvedDate ? date(acc.approvedDate) : '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-faint">Activated</dt><dd>{{ acc.activatedDate ? date(acc.activatedDate) : '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-faint">Closed</dt><dd>{{ acc.closedDate ? date(acc.closedDate) : '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-faint">Min opening balance</dt><dd class="tnum">{{ money(acc.product?.minOpeningBalance ?? 0) }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-faint">Withdrawal fee</dt><dd class="tnum">{{ money(acc.product?.withdrawalFee ?? 0) }}</dd></div>
        </dl>
      </BaseCard>
    </div>

    <ModalShell :open="!!action" :title="action ? cfg[action].title : ''" :subtitle="acc.accountNo" @close="action = null">
      <div class="space-y-4">
        <div v-if="action === 'close'" class="rounded-lg bg-red-50 border border-red-200 p-4 text-xs text-red-700">
          The remaining balance of <strong>{{ money(acc.balance) }}</strong> will be paid out in cash and the account closed.
        </div>
        <FormField v-if="action === 'activate' || action === 'deposit' || action === 'withdraw'"
          :label="action === 'withdraw' ? `Withdrawal amount (available ${money(acc.balance)})` : 'Amount'">
          <TextInput v-model.number="form.amount" type="number" :min="0.01" :max="action === 'withdraw' ? acc.balance : undefined" />
          <p v-if="action === 'activate'" class="text-[11px] text-ink-faint mt-1">Minimum opening balance: {{ money(acc.product?.minOpeningBalance ?? 0) }}</p>
        </FormField>
        <FormField v-if="action === 'activate' || action === 'deposit' || action === 'withdraw'" label="Payment channel">
          <SelectInput v-model="form.paymentType" :options="(acc.paymentTypes ?? []).map((t: string) => ({ value: t, label: t }))" />
        </FormField>
        <FormField label="Note">
          <TextareaInput v-model="form.note" :rows="2" />
        </FormField>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="action = null">Cancel</BaseButton>
        <BaseButton size="sm" :variant="action ? cfg[action].tone : 'primary'" :disabled="busy" @click="submit">
          {{ busy ? 'Processing…' : action ? cfg[action].btn : 'Confirm' }}
        </BaseButton>
      </template>
    </ModalShell>
  </div>

  <div v-else-if="pending" class="space-y-4">
    <div class="h-24 rounded-xl bg-surface border border-line animate-pulse" />
    <div class="h-72 rounded-xl bg-surface border border-line animate-pulse" />
  </div>
</template>
