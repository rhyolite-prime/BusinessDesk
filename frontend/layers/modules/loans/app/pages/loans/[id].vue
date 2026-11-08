<script setup lang="ts">
useHead({ title: 'Loan Account' })
const route = useRoute()
const toast = useToast()
const api = useApi()
const { money, date, pct } = useFormat()
const { loanStatus, meta } = useStatusMeta()

const { data: loan, pending, refresh } = await useAsyncData('loan-' + route.params.id,
  () => $fetch<any>(`/api/loans/${route.params.id}`))

const tab = ref('schedule')

const steps = [
  { key: 'submitted', label: 'Submitted', icon: 'document-text' },
  { key: 'approved', label: 'Approved', icon: 'check-circle' },
  { key: 'active', label: 'Disbursed', icon: 'banknotes' },
  { key: 'closed', label: 'Closed', icon: 'check' },
]
const stepIndex = computed(() => {
  const s = loan.value?.status
  if (s === 'submitted') return 0
  if (s === 'approved') return 1
  if (s === 'active') return 2
  if (s === 'closed') return 3
  if (s === 'rejected' || s === 'withdrawn' || s === 'writtenoff') return -1
  return 0
})

// ── action modal state ──
const action = ref<null | 'approve' | 'reject' | 'disburse' | 'repayment' | 'writeoff' | 'withdraw'>(null)
const form = reactive({ amount: null as number | null, paymentType: 'Cash', date: new Date().toISOString().slice(0, 10), note: '' })
const busy = ref(false)

const actionConfig = computed(() => ({
  approve: { title: 'Approve Loan', btn: 'Approve', tone: 'primary' as const, amount: false },
  reject: { title: 'Reject Loan', btn: 'Reject', tone: 'danger' as const, amount: false },
  withdraw: { title: 'Withdraw Application', btn: 'Withdraw', tone: 'danger' as const, amount: false },
  disburse: { title: 'Disburse Loan', btn: 'Disburse funds', tone: 'primary' as const, amount: false },
  repayment: { title: 'Record Repayment', btn: 'Post repayment', tone: 'success' as const, amount: true },
  writeoff: { title: 'Write Off Loan', btn: 'Write off', tone: 'danger' as const, amount: false },
}))

watch(loan, (l) => {
  if (l) {
    const nextDue = l.schedule.find((e: any) => e.remaining > 0.01)
    form.amount = nextDue ? Math.round(nextDue.totalDue) : l.outstanding
    form.paymentType = 'Cash'
  }
}, { immediate: true })

async function submitAction() {
  if (!action.value) return
  busy.value = true
  try {
    const res: any = await api.post(`/loans/${route.params.id}/${action.value}`, { ...form })
    toast.success('Action complete', res.message)
    action.value = null
    await refresh()
  } catch (e: any) { toast.error('Action failed', e.message) } finally { busy.value = false }
}

const statusTone = computed(() => loan.value ? loanStatus(loan.value) : meta('submitted'))
</script>

<template>
  <div v-if="loan">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-4 mb-5">
      <div class="min-w-0">
        <p class="text-xs text-ink-faint mb-1 flex items-center gap-1">
          <NuxtLink to="/loans" class="hover:text-primary">Loans</NuxtLink>
          <AppIcon name="chevron-right" :size="12" />
          <NuxtLink :to="`/clients/${loan.clientId}`" class="hover:text-primary">{{ loan.clientName }}</NuxtLink>
        </p>
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-xl font-bold text-ink">{{ loan.accountNo }}</h1>
          <Badge :tone="statusTone.tone" dot>{{ statusTone.label }}</Badge>
          <Badge tone="gray">{{ loan.productName }}</Badge>
        </div>
        <p class="text-sm text-ink-faint mt-1">{{ loan.officeName }} · Officer {{ loan.staffName }}</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <BaseButton v-if="loan.status === 'submitted'" size="sm" variant="secondary" icon="x-circle"
          @click="action = 'withdraw'">Withdraw</BaseButton>
        <BaseButton v-if="loan.status === 'submitted'" size="sm" variant="danger" icon="x-mark"
          @click="action = 'reject'">Reject</BaseButton>
        <BaseButton v-if="loan.status === 'submitted'" size="sm" variant="success" icon="check-circle"
          @click="action = 'approve'">Approve</BaseButton>
        <BaseButton v-if="loan.status === 'approved'" size="sm" icon="banknotes"
          @click="action = 'disburse'">Disburse</BaseButton>
        <BaseButton v-if="loan.status === 'active'" size="sm" variant="success" icon="arrow-trending-down"
          @click="action = 'repayment'">Record Repayment</BaseButton>
        <BaseButton v-if="loan.status === 'active' && loan.overdueAmount > 0" size="sm" variant="danger" icon="x-circle"
          @click="action = 'writeoff'">Write Off</BaseButton>
      </div>
    </div>

    <!-- Lifecycle stepper -->
    <BaseCard v-if="!['rejected', 'withdrawn', 'writtenoff'].includes(loan.status)" :pad="false" class="mb-5">
      <div class="px-6 py-5 flex items-center">
        <template v-for="(s, i) in steps" :key="s.key">
          <div class="flex items-center gap-2.5">
            <span class="w-9 h-9 rounded-full flex items-center justify-center border-2 transition"
              :class="i <= stepIndex ? 'bg-primary border-primary text-on-primary' : 'border-line bg-white text-ink-faint'">
              <AppIcon :name="s.icon" :size="16" />
            </span>
            <div class="hidden sm:block">
              <p class="text-xs font-semibold" :class="i <= stepIndex ? 'text-ink' : 'text-ink-faint'">{{ s.label }}</p>
              <p class="text-[10px] text-ink-faint">
                {{ i === 0 ? date(loan.submittedDate) : i === 1 ? (loan.approvedDate ? date(loan.approvedDate) : '—') : i === 2 ? (loan.disbursedDate ? date(loan.disbursedDate) : '—') : (loan.closedDate ? date(loan.closedDate) : '—') }}
              </p>
            </div>
          </div>
          <div v-if="i < steps.length - 1" class="flex-1 h-0.5 mx-3 rounded" :class="i < stepIndex ? 'bg-primary' : 'bg-line'" />
        </template>
      </div>
    </BaseCard>

    <div v-else class="mb-5">
      <div class="rounded-xl border px-5 py-4 flex items-center gap-3"
        :class="loan.status === 'rejected' || loan.status === 'writtenoff' ? 'border-red-200 bg-red-50' : 'border-line bg-canvas'">
        <AppIcon :name="loan.status === 'withdrawn' ? 'pause-circle' : 'x-circle'" :size="22"
          :class="loan.status === 'withdrawn' ? 'text-ink-faint' : 'text-red-500'" />
        <div>
          <p class="text-sm font-semibold">{{ loan.status === 'rejected' ? 'Application rejected' : loan.status === 'withdrawn' ? 'Application withdrawn by maker' : 'Loan written off' }}</p>
          <p class="text-xs text-ink-faint">{{ loan.rejectedDate || loan.writtenOffDate ? date(loan.rejectedDate || loan.writtenOffDate) : '' }} — recorded in audit trail and GL.</p>
        </div>
      </div>
    </div>

    <!-- Position cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard label="Principal" :value="money(loan.principal)" icon="banknotes" tone="primary" :hint="`${loan.term} ${loan.termFrequency} at ${loan.interestRate}%`" />
      <StatCard label="Outstanding" :value="money(loan.outstanding)" icon="clock" tone="amber" />
      <StatCard label="Overdue" :value="money(loan.overdueAmount)" icon="exclamation-triangle" :tone="loan.overdueAmount > 0 ? 'red' : 'green'" />
      <StatCard label="Collected" :value="money(loan.paidPrincipal + loan.paidInterest + loan.paidFees)" icon="check-circle" tone="green"
        :hint="loan.nextDue && loan.status === 'active' ? `Next due ${date(loan.nextDue)}` : ''" />
    </div>

    <Tabs v-model="tab" :tabs="[
      { key: 'schedule', label: 'Repayment Schedule', icon: 'calendar-days', count: loan.schedule.length },
      { key: 'ledger', label: 'Transactions', icon: 'list-bullet', count: loan.transactions.length },
      { key: 'details', label: 'Terms & Security', icon: 'document-text' },
    ]" />

    <div class="mt-5">
      <BaseCard v-if="tab === 'schedule'" :pad="false">
        <DataTable
          :columns="[
            { key: 'period', label: '#', align: 'center' }, { key: 'dueDate', label: 'Due date' },
            { key: 'principalDue', label: 'Principal', align: 'right' }, { key: 'interestDue', label: 'Interest', align: 'right' },
            { key: 'feesDue', label: 'Fees', align: 'right' }, { key: 'totalDue', label: 'Due', align: 'right' },
            { key: 'remaining', label: 'Balance due', align: 'right' }, { key: 'rowStatus', label: 'Status', align: 'center' }]"
          :rows="loan.schedule">
          <template #cell="{ col, row }">
            <span v-if="['principalDue', 'interestDue', 'feesDue', 'totalDue'].includes(col.key)" class="tnum text-xs">{{ money(row[col.key]) }}</span>
            <span v-else-if="col.key === 'remaining'" class="tnum font-semibold" :class="row.remaining > 0.01 ? (row.rowStatus === 'overdue' ? 'text-red-600' : 'text-ink') : 'text-emerald-600'">
              {{ money(Math.max(0, row.remaining)) }}
            </span>
            <span v-else-if="col.key === 'dueDate'" class="text-xs">{{ date(row.dueDate) }}</span>
            <span v-else-if="col.key === 'rowStatus'"><Badge size="sm" :tone="meta(row.rowStatus).tone" dot>{{ meta(row.rowStatus).label }}</Badge></span>
            <span v-else>{{ row[col.key] }}</span>
          </template>
        </DataTable>
      </BaseCard>

      <BaseCard v-else-if="tab === 'ledger'" :pad="false">
        <DataTable
          :columns="[
            { key: 'date', label: 'Date' }, { key: 'type', label: 'Transaction' },
            { key: 'principal', label: 'Principal', align: 'right' }, { key: 'interest', label: 'Interest', align: 'right' },
            { key: 'fees', label: 'Fees', align: 'right' }, { key: 'amount', label: 'Amount', align: 'right' },
            { key: 'paymentType', label: 'Channel' }]"
          :rows="loan.transactions">
          <template #cell="{ col, row }">
            <span v-if="col.key === 'date'" class="text-xs">{{ date(row.date) }}</span>
            <span v-else-if="col.key === 'type'" class="capitalize font-medium text-ink">{{ row.type }}</span>
            <span v-else-if="['principal', 'interest', 'fees', 'amount'].includes(col.key)" class="tnum text-xs"
              :class="col.key === 'amount' ? 'font-semibold ' + (row.type === 'disbursement' ? 'text-red-600' : 'text-emerald-700') : ''">
              {{ row.type === 'disbursement' && col.key !== 'principal' && col.key !== 'amount' ? '—' : money(row[col.key]) }}
            </span>
            <span v-else class="text-xs">{{ row[col.key] }}</span>
          </template>
        </DataTable>
      </BaseCard>

      <div v-else class="grid lg:grid-cols-2 gap-4">
        <BaseCard title="Loan terms" icon="document-text">
          <dl class="space-y-3 text-sm">
            <div class="flex justify-between"><dt class="text-ink-faint">Client</dt><dd><NuxtLink :to="`/clients/${loan.clientId}`" class="text-primary font-medium hover:underline">{{ loan.clientName }}</NuxtLink></dd></div>
            <div class="flex justify-between"><dt class="text-ink-faint">Product</dt><dd class="font-medium">{{ loan.productName }}</dd></div>
            <div class="flex justify-between"><dt class="text-ink-faint">Principal</dt><dd class="font-semibold tnum">{{ money(loan.principal) }}</dd></div>
            <div class="flex justify-between"><dt class="text-ink-faint">Interest rate</dt><dd class="tnum">{{ loan.interestRate }}% p.a. declining</dd></div>
            <div class="flex justify-between"><dt class="text-ink-faint">Term</dt><dd class="tnum">{{ loan.term }} {{ loan.termFrequency }}</dd></div>
            <div class="flex justify-between"><dt class="text-ink-faint">Repayment</dt><dd>Every {{ loan.repayEvery }} {{ loan.repayFrequency }}</dd></div>
            <div class="flex justify-between"><dt class="text-ink-faint">Purpose</dt><dd class="text-right">{{ loan.purpose }}</dd></div>
            <div class="flex justify-between"><dt class="text-ink-faint">Expected maturity</dt><dd>{{ loan.expectedMaturity ? date(loan.expectedMaturity) : '—' }}</dd></div>
          </dl>
        </BaseCard>
        <BaseCard title="Security" icon="shield-check">
          <dl class="space-y-3 text-sm">
            <div><dt class="text-ink-faint mb-1">Collateral</dt><dd class="font-medium">{{ loan.collateral }}</dd></div>
            <div><dt class="text-ink-faint mb-1">Guarantor</dt><dd class="font-medium">{{ loan.guarantor }}</dd></div>
            <div class="flex justify-between"><dt class="text-ink-faint">Disbursement channel</dt><dd>Cash / mobile money</dd></div>
          </dl>
        </BaseCard>
      </div>
    </div>

    <!-- Action modal -->
    <ModalShell :open="!!action" :title="action ? actionConfig[action].title : ''" :subtitle="loan.accountNo" @close="action = null">
      <div class="space-y-4">
        <div v-if="action === 'disburse'" class="rounded-lg bg-primary-soft p-4 text-sm text-primary">
          <p class="font-semibold">{{ money(loan.principal) }} will be released to {{ loan.clientName }}.</p>
          <p class="text-xs mt-1 text-ink-soft">The system posts Dr Loan Portfolio / Cr Cash and collects the 2% processing fee automatically.</p>
        </div>
        <div v-if="action === 'repayment'">
          <FormField label="Amount received" required>
            <TextInput v-model.number="form.amount" type="number" :min="1" :max="loan.outstanding" />
          </FormField>
          <p class="text-[11px] text-ink-faint mt-1.5">Outstanding: {{ money(loan.outstanding) }}<span v-if="loan.overdueAmount > 0"> · overdue {{ money(loan.overdueAmount) }}</span></p>
        </div>
        <div v-if="action === 'writeoff'" class="rounded-lg bg-red-50 border border-red-200 p-4 text-xs text-red-700">
          This charges <strong>{{ money(loan.outstanding) }}</strong> to loan-loss and closes the account. The action is posted to the GL and cannot be undone.
        </div>
        <FormField v-if="action === 'disburse' || action === 'repayment'" label="Payment channel">
          <SelectInput v-model="form.paymentType" :options="(loan.paymentTypes ?? []).map((t: string) => ({ value: t, label: t }))" />
        </FormField>
        <FormField label="Notes">
          <TextareaInput v-model="form.note" :rows="2" placeholder="Optional note for the audit trail" />
        </FormField>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="action = null">Cancel</BaseButton>
        <BaseButton size="sm" :variant="action ? actionConfig[action].tone : 'primary'" :disabled="busy" @click="submitAction">
          {{ busy ? 'Processing…' : action ? actionConfig[action].btn : 'Confirm' }}
        </BaseButton>
      </template>
    </ModalShell>
  </div>

  <div v-else-if="pending" class="space-y-4">
    <div class="h-24 rounded-xl bg-surface border border-line animate-pulse" />
    <div class="h-72 rounded-xl bg-surface border border-line animate-pulse" />
  </div>
</template>
