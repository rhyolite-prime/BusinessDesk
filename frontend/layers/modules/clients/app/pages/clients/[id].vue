<script setup lang="ts">
useHead({ title: 'Client' })
const route = useRoute()
const id = computed(() => Number(route.params.id))
const toast = useToast()
const api = useApi()
const { money, date, dateTime, num, initials } = useFormat()
const { meta, loanStatus } = useStatusMeta()
const { data: refData } = await useAsyncData('meta-client-view', () => $fetch<any>('/api/system/meta'))

const { data: client, pending, refresh } = await useAsyncData('client-' + route.params.id,
  () => $fetch<any>(`/api/clients/${route.params.id}`))
const { data: products } = await useAsyncData('products-for-client', () => $fetch<any>('/api/loan-products'))
const { data: savProducts } = await useAsyncData('savproducts-for-client', () => $fetch<any>('/api/savings-products'))

const tab = ref('overview')

// ── modals ──
const showLoan = ref(false)
const showSavings = ref(false)
const confirmAction = ref<null | { action: string; label: string; tone: 'primary' | 'danger'; message: string }>(null)
const busy = ref(false)

const loanForm = reactive({ productId: '', principal: null as number | null, term: null as number | null, purpose: 'Working capital', collateral: '', guarantor: '' })
const savForm = reactive({ productId: '' })
const loanProduct = computed(() => products.value?.pageItems?.find((p: any) => p.id === Number(loanForm.productId)))

watch(loanProduct, (p) => {
  if (p) { loanForm.principal = p.principalMin; loanForm.term = p.termMin }
}, { immediate: false })

const monthlyInstallment = computed(() => {
  const p = loanProduct.value
  if (!p || !loanForm.principal || p.repayFrequency !== 'months') return null
  const r = (7 / 100) / 12
  const n = Math.max(1, (loanForm.term ?? p.termMin))
  const inst = (loanForm.principal * r) / (1 - Math.pow(1 + r, -n))
  return Math.round(inst)
})

async function openLoan() {
  if (!loanForm.productId || !loanForm.principal) { toast.error('Select a product and principal'); return }
  busy.value = true
  try {
    const res: any = await api.post('/loans', {
      clientId: id.value, productId: Number(loanForm.productId),
      principal: loanForm.principal, term: loanForm.term,
      purpose: loanForm.purpose, collateral: loanForm.collateral, guarantor: loanForm.guarantor,
    })
    toast.success('Loan application submitted', res.message)
    showLoan.value = false
    await refresh()
  } catch (e: any) { toast.error('Loan submission failed', e.message) } finally { busy.value = false }
}

async function openSavings() {
  if (!savForm.productId) { toast.error('Select a savings product'); return }
  busy.value = true
  try {
    const res: any = await api.post('/savings', { clientId: id.value, productId: Number(savForm.productId) })
    toast.success('Savings account opened', res.message)
    showSavings.value = false
    await refresh()
  } catch (e: any) { toast.error('Could not open account', e.message) } finally { busy.value = false }
}

async function runAction() {
  if (!confirmAction.value) return
  busy.value = true
  try {
    const res: any = await api.post(`/clients/${id.value}/${confirmAction.value.action}`)
    toast.success('Done', res.message)
    await refresh()
  } catch (e: any) { toast.error('Action failed', e.message) } finally { busy.value = false; confirmAction.value = null }
}

const familyRows = computed(() => client.value?.family ?? [])
</script>

<template>
  <div v-if="client">
    <!-- Breadcrumb + identity -->
    <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div class="flex items-center gap-4 min-w-0">
        <span class="w-16 h-16 rounded-2xl bg-primary text-on-primary flex items-center justify-center text-xl font-bold shrink-0 shadow-sm">
          {{ initials(client.displayName) }}
        </span>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-xl font-bold text-ink truncate">{{ client.displayName }}</h1>
            <Badge :tone="meta(client.status).tone" dot>{{ meta(client.status).label }}</Badge>
            <Badge tone="gray">{{ client.clientType === 'business' ? 'Business' : 'Individual' }}</Badge>
          </div>
          <p class="text-sm text-ink-faint mt-0.5">
            {{ client.accountNo }} · {{ client.officeName }} · Officer: {{ client.staffName }}
          </p>
          <p class="text-xs text-ink-faint mt-0.5">
            <NuxtLink to="/clients" class="hover:text-primary">Clients</NuxtLink>
            <AppIcon name="chevron-right" :size="12" class="inline mx-1" />{{ client.displayName }}
          </p>
        </div>
      </div>
      <div class="flex gap-2 flex-wrap">
        <BaseButton size="sm" variant="secondary" icon="banknotes" @click="showLoan = true">New Loan</BaseButton>
        <BaseButton size="sm" variant="secondary" icon="wallet" @click="showSavings = true">Open Savings</BaseButton>
        <BaseButton v-if="client.status === 'pending'" size="sm" variant="success" icon="check"
          @click="confirmAction = { action: 'activate', label: 'Activate', tone: 'primary', message: `Activate ${client.displayName}? This makes the client eligible for accounts and transactions.` }">
          Activate
        </BaseButton>
        <BaseButton v-if="client.status === 'active'" size="sm" variant="danger" icon="x-mark"
          @click="confirmAction = { action: 'close', label: 'Close client', tone: 'danger', message: `Close ${client.displayName}? Linked accounts should be settled first.` }">
          Close
        </BaseButton>
      </div>
    </div>

    <!-- Position cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard label="Loan outstanding" :value="money(client.totals.loanOutstanding)" icon="credit-card" tone="red" />
      <StatCard label="Savings balance" :value="money(client.totals.savingsBalance)" icon="wallet" tone="green" />
      <StatCard label="Loan accounts" :value="num(client.loans.length)" icon="banknotes" tone="primary" />
      <StatCard label="Savings accounts" :value="num(client.savings.length)" icon="user-group" tone="blue" />
    </div>

    <Tabs v-model="tab" :tabs="[
      { key: 'overview', label: 'Overview', icon: 'user' },
      { key: 'accounts', label: 'Accounts', icon: 'banknotes', count: client.loans.length + client.savings.length },
      { key: 'kyc', label: 'Profile & KYC', icon: 'identification' },
      { key: 'groups', label: 'Groups', icon: 'user-group', count: client.groups.length },
    ]" />

    <div class="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-4">
      <!-- LEFT -->
      <div class="xl:col-span-2 space-y-4">
        <BaseCard v-if="tab === 'overview'" title="Accounts summary" icon="banknotes" :pad="false">
          <EmptyState v-if="!client.loans.length && !client.savings.length" icon="wallet"
            title="No accounts yet" message="Open the first loan or savings account for this customer.">
            <BaseButton size="sm" icon="plus" @click="showSavings = true">Open Savings</BaseButton>
          </EmptyState>
          <ul v-else class="divide-y divide-line">
            <li v-for="l in client.loans" :key="'l' + l.id">
              <NuxtLink :to="`/loans/${l.id}`" class="flex items-center gap-4 px-5 py-3.5 hover:bg-primary-soft/40">
                <span class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0"><AppIcon name="credit-card" :size="18" /></span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-ink">{{ l.accountNo }} · {{ l.productName }}</p>
                  <p class="text-[11px] text-ink-faint">Submitted {{ date(l.submittedDate) }}<span v-if="l.disbursedDate"> · disbursed {{ date(l.disbursedDate) }}</span></p>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-sm font-bold tnum">{{ money(l.outstanding) }}</p>
                  <Badge size="sm" :tone="loanStatus(l).tone" dot>{{ loanStatus(l).label }}</Badge>
                </div>
              </NuxtLink>
            </li>
            <li v-for="s in client.savings" :key="'s' + s.id">
              <NuxtLink :to="`/savings/${s.id}`" class="flex items-center gap-4 px-5 py-3.5 hover:bg-primary-soft/40">
                <span class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><AppIcon name="wallet" :size="18" /></span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-ink">{{ s.accountNo }} · {{ s.productName }}</p>
                  <p class="text-[11px] text-ink-faint">{{ s.activatedDate ? 'Activated ' + date(s.activatedDate) : 'Awaiting activation' }} · {{ s.interestRate }}% p.a.</p>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-sm font-bold tnum">{{ money(s.balance) }}</p>
                  <Badge size="sm" :tone="meta(s.status).tone" dot>{{ meta(s.status).label }}</Badge>
                </div>
              </NuxtLink>
            </li>
          </ul>
        </BaseCard>

        <BaseCard v-if="tab === 'accounts'" title="All accounts" icon="list-bullet" :pad="false">
          <DataTable
            :columns="[
              { key: 'type', label: 'Type' }, { key: 'accountNo', label: 'Account' },
              { key: 'product', label: 'Product' }, { key: 'balance', label: 'Balance', align: 'right' },
              { key: 'status', label: 'Status', align: 'center' }]"
            :rows="[
              ...client.loans.map((l: any) => ({ id: 'l' + l.id, type: 'Loan', accountNo: l.accountNo, product: l.productName, balance: l.outstanding, status: loanStatus(l).label, tone: loanStatus(l).tone, to: `/loans/${l.id}` })),
              ...client.savings.map((s: any) => ({ id: 's' + s.id, type: 'Savings', accountNo: s.accountNo, product: s.productName, balance: s.balance, status: meta(s.status).label, tone: meta(s.status).tone, to: `/savings/${s.id}` })),
            ]"
            @row-click="(r: any) => $router.push(r.to)">
            <template #cell="{ col, row }">
              <AppIcon v-if="col.key === 'type'" :name="row.type === 'Loan' ? 'credit-card' : 'wallet'" :size="16"
                :class="row.type === 'Loan' ? 'text-red-500' : 'text-emerald-600'" />
              <span v-else-if="col.key === 'balance'" class="tnum font-semibold">{{ money(row.balance) }}</span>
              <Badge v-else-if="col.key === 'status'" size="sm" :tone="row.tone" dot>{{ row.status }}</Badge>
              <span v-else>{{ row[col.key] }}</span>
            </template>
          </DataTable>
        </BaseCard>

        <BaseCard v-if="tab === 'kyc'" title="Family & next of kin" icon="users">
          <EmptyState v-if="!familyRows.length" title="No family members recorded" />
          <ul v-else class="divide-y divide-line -my-5">
            <li v-for="(f, i) in familyRows" :key="i" class="py-3 flex items-center gap-3">
              <span class="w-9 h-9 rounded-full bg-canvas flex items-center justify-center text-xs font-bold text-ink-soft">{{ initials(f.name) }}</span>
              <div class="flex-1"><p class="text-sm font-medium text-ink">{{ f.name }}</p><p class="text-[11px] text-ink-faint">{{ f.relationship }}</p></div>
              <span class="text-xs text-ink-faint flex items-center gap-1"><AppIcon name="phone" :size="13" />{{ f.mobile }}</span>
            </li>
          </ul>
        </BaseCard>
      </div>

      <!-- RIGHT -->
      <div class="space-y-4">
        <BaseCard title="Profile" icon="identification">
          <dl class="space-y-3 text-sm">
            <div class="flex justify-between gap-4"><dt class="text-ink-faint">External ID</dt><dd class="font-medium tnum">{{ client.externalId }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-ink-faint">Mobile</dt><dd class="font-medium">{{ client.mobile }}</dd></div>
            <div v-if="client.email" class="flex justify-between gap-4"><dt class="text-ink-faint">Email</dt><dd class="font-medium truncate">{{ client.email }}</dd></div>
            <div v-if="client.dob" class="flex justify-between gap-4"><dt class="text-ink-faint">Date of birth</dt><dd class="font-medium">{{ date(client.dob) }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-ink-faint">Submitted</dt><dd class="font-medium">{{ date(client.submittedDate) }}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-ink-faint">Activated</dt><dd class="font-medium">{{ client.activationDate ? date(client.activationDate) : '—' }}</dd></div>
          </dl>
        </BaseCard>

        <BaseCard title="Identification" icon="identification">
          <ul class="space-y-3">
            <li v-for="(doc, i) in client.identifiers" :key="i" class="flex items-center gap-3 text-sm">
              <AppIcon name="check-circle" :size="16" class="text-emerald-600" />
              <div class="flex-1"><p class="font-medium text-ink">{{ doc.type }}</p><p class="text-[11px] text-ink-faint tnum">{{ doc.number }}</p></div>
              <Badge size="sm" :tone="doc.status === 'verified' ? 'green' : 'amber'">{{ doc.status }}</Badge>
            </li>
          </ul>
        </BaseCard>

        <BaseCard title="Address" icon="map-pin">
          <p class="text-sm text-ink-soft leading-relaxed">
            {{ client.address.line1 }}<br />{{ client.address.town }}, {{ client.address.city }}
          </p>
        </BaseCard>

        <BaseCard v-if="tab === 'groups'" title="Group membership" icon="user-group" :pad="false">
          <EmptyState v-if="!client.groups.length" title="Not in any group" message="Group membership enables joint-liability lending." />
          <ul v-else class="divide-y divide-line">
            <li v-for="g in client.groups" :key="g.id">
              <NuxtLink :to="`/groups/${g.id}`" class="flex items-center gap-3 px-5 py-3 hover:bg-primary-soft/40">
                <AppIcon name="user-group" :size="17" class="text-primary" />
                <div class="flex-1"><p class="text-sm font-medium text-ink">{{ g.name }}</p><p class="text-[11px] text-ink-faint">{{ g.accountNo }} · meets {{ g.meetingDay }}</p></div>
                <AppIcon name="chevron-right" :size="15" class="text-ink-faint" />
              </NuxtLink>
            </li>
          </ul>
        </BaseCard>

        <BaseCard title="Documents" icon="document-text">
          <ul class="space-y-2">
            <li v-for="(doc, i) in client.documents" :key="i" class="flex items-center gap-3 text-sm">
              <AppIcon name="document-text" :size="16" class="text-ink-faint" />
              <span class="flex-1 text-ink-soft">{{ doc.name }}</span>
              <span class="text-[10px] text-ink-faint">{{ doc.type }}</span>
            </li>
          </ul>
        </BaseCard>
      </div>
    </div>

    <!-- New loan modal -->
    <ModalShell :open="showLoan" title="Originate Loan" :subtitle="client.displayName" width="max-w-xl" @close="showLoan = false">
      <div class="space-y-4">
        <FormField label="Loan product" required>
          <SelectInput v-model="loanForm.productId" placeholder="Choose product"
            :options="(products?.pageItems ?? []).filter((p: any) => p.active).map((p: any) => ({ value: p.id, label: `${p.name} (${p.shortName}) — ${p.repayFrequency === 'months' ? p.interestRateMin + '% p.a. reducing' : p.interestRateMin + '% flat'}` }))" />
        </FormField>
        <div v-if="loanProduct" class="grid sm:grid-cols-2 gap-4">
          <FormField :label="`Principal (GH₵ ${loanProduct.principalMin} – ${loanProduct.principalMax})`" required>
            <TextInput v-model.number="loanForm.principal" type="number" :min="loanProduct.principalMin" :max="loanProduct.principalMax" />
          </FormField>
          <FormField :label="`Term (${loanProduct.termFrequency}, ${loanProduct.termMin}–${loanProduct.termMax})`">
            <TextInput v-model.number="loanForm.term" type="number" :min="loanProduct.termMin" :max="loanProduct.termMax" />
          </FormField>
        </div>
        <div v-if="monthlyInstallment" class="rounded-lg bg-primary-soft px-4 py-3 text-sm text-primary font-medium flex items-center gap-2">
          <AppIcon name="information-circle" :size="16" />
          Estimated monthly installment: <strong>{{ money(monthlyInstallment) }}</strong>
        </div>
        <FormField label="Loan purpose">
          <TextInput v-model="loanForm.purpose" placeholder="Working capital" />
        </FormField>
        <div class="grid sm:grid-cols-2 gap-4">
          <FormField label="Collateral">
            <TextInput v-model="loanForm.collateral" placeholder="e.g. Two guarantors" />
          </FormField>
          <FormField label="Guarantor">
            <TextInput v-model="loanForm.guarantor" placeholder="Name & relationship" />
          </FormField>
        </div>
        <p class="text-[11px] text-ink-faint">Applications enter the <strong>submitted</strong> state and require approval + disbursal before money moves. A maker-checker task may be raised depending on tenant policy.</p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="showLoan = false">Cancel</BaseButton>
        <BaseButton size="sm" icon="check" :disabled="busy" @click="openLoan">Submit application</BaseButton>
      </template>
    </ModalShell>

    <!-- New savings modal -->
    <ModalShell :open="showSavings" title="Open Savings Account" :subtitle="client.displayName" @close="showSavings = false">
      <div class="space-y-4">
        <FormField label="Savings product" required>
          <SelectInput v-model="savForm.productId" placeholder="Choose product"
            :options="(savProducts?.pageItems ?? []).filter((p: any) => p.active).map((p: any) => ({ value: p.id, label: `${p.name} — ${p.interestRate}% p.a., min GH₵${p.minOpeningBalance}` }))" />
        </FormField>
        <div v-if="savForm.productId" class="rounded-lg bg-canvas p-4 text-xs text-ink-soft space-y-1">
          <p>{{ savProducts.pageItems.find((p: any) => p.id === Number(savForm.productId))?.description }}</p>
        </div>
        <p class="text-[11px] text-ink-faint">Account opens as <strong>submitted</strong> → approval → activation with the opening deposit.</p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="showSavings = false">Cancel</BaseButton>
        <BaseButton size="sm" icon="check" :disabled="busy" @click="openSavings">Open account</BaseButton>
      </template>
    </ModalShell>

    <ConfirmDialog :open="!!confirmAction" :title="confirmAction?.label ?? ''" :message="confirmAction?.message ?? ''"
      :tone="confirmAction?.tone === 'danger' ? 'danger' : 'primary'" :loading="busy"
      @confirm="runAction" @cancel="confirmAction = null" />
  </div>

  <div v-else-if="pending" class="space-y-4">
    <div class="h-24 rounded-xl bg-surface border border-line animate-pulse" />
    <div class="h-64 rounded-xl bg-surface border border-line animate-pulse" />
  </div>
</template>
