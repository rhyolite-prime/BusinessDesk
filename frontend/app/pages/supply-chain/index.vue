<script setup lang="ts">
import { useSupplyChain, type PurchaseOrder, type PurchaseReceipt, type Requisition } from '../../features/supply-chain/useSupplyChain'
import { supplyChainPages } from '../../features/supply-chain/navigation'

definePageMeta({
  layout: 'admin-supply-chain',
  middleware: (to) => {
    const tab = String(to.query.tab || '')
    if (['requisitions', 'orders', 'receipts'].includes(tab))
      return navigateTo({ path: '/supply-chain/operations', query: { tab } }, { replace: true })
  },
})
useHead({ title: 'Supply chain dashboard' })

interface Unit { id: string; code: string; name: string; isActive?: boolean }

const api = useSupplyChain()
const { unitId } = api
const request = useRequestFetch()
const units = ref<Unit[]>([])
const loadingUnits = ref(true)
const loading = ref(false)
const error = ref('')
const message = (e: any) => e?.data?.statusMessage || e?.statusMessage || 'Could not load the supply chain dashboard.'

const metrics = reactive({
  requisitions: 0,
  requisitionApprovals: 0,
  orders: 0,
  orderApprovals: 0,
  openOrders: 0,
  receipts: 0,
  draftReceipts: 0,
})
const recentRequisitions = ref<Requisition[]>([])
const recentOrders = ref<PurchaseOrder[]>([])
const recentReceipts = ref<PurchaseReceipt[]>([])
const unitOptions = computed(() => units.value.map((unit) => ({ value: unit.id, label: `${unit.code} — ${unit.name}` })))
const links = supplyChainPages.filter((page) => page.path !== '/supply-chain')

async function loadUnits() {
  loadingUnits.value = true
  error.value = ''
  try {
    const rows: Unit[] = []
    for (let pageNo = 1; pageNo <= 50; pageNo++) {
      const result = await request<{ data: Unit[]; totalPages: number }>('/api/ledger/accounting-units', {
        query: { pageNo, pageSize: 200 },
      })
      rows.push(...result.data)
      if (!result.data.length || pageNo >= result.totalPages) break
    }
    units.value = rows.filter((unit) => unit.isActive !== false)
    if (!unitId.value && units.value.length) unitId.value = units.value[0].id
    else await loadDashboard()
  } catch (e) {
    error.value = message(e)
  } finally {
    loadingUnits.value = false
  }
}

async function loadDashboard() {
  const unit = unitId.value
  error.value = ''
  if (!unit) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    // Status-filtered lists provide exact totalCount values without downloading
    // the full transaction history into the browser.
    const [reqs, reqSubmitted, orders, orderSubmitted, orderApproved, orderSent, orderPartial, receipts, receiptDrafts] = await Promise.all([
      api.requisitions.list(unit, '', '', 1, 5),
      api.requisitions.list(unit, '', 'submitted', 1, 1),
      api.orders.list(unit, '', '', 1, 5),
      api.orders.list(unit, '', 'submitted', 1, 1),
      api.orders.list(unit, '', 'approved', 1, 1),
      api.orders.list(unit, '', 'sent', 1, 1),
      api.orders.list(unit, '', 'partially_received', 1, 1),
      api.receipts.list(unit, '', '', 1, 5),
      api.receipts.list(unit, '', 'draft', 1, 1),
    ])
    if (unitId.value !== unit) return
    Object.assign(metrics, {
      requisitions: reqs.total,
      requisitionApprovals: reqSubmitted.total,
      orders: orders.total,
      orderApprovals: orderSubmitted.total,
      openOrders: orderApproved.total + orderSent.total + orderPartial.total,
      receipts: receipts.total,
      draftReceipts: receiptDrafts.total,
    })
    recentRequisitions.value = reqs.items
    recentOrders.value = orders.items
    recentReceipts.value = receipts.items
  } catch (e) {
    if (unitId.value === unit) error.value = message(e)
  } finally {
    if (unitId.value === unit) loading.value = false
  }
}

const statusChip = (status: string) => ({
  submitted: 'bg-amber-50 text-amber-700',
  approved: 'bg-primary-soft text-primary',
  sent: 'bg-blue-50 text-blue-700',
  partially_ordered: 'bg-blue-50 text-blue-700',
  ordered: 'bg-blue-50 text-blue-700',
  partially_received: 'bg-purple-50 text-purple-600',
  received: 'bg-emerald-50 text-emerald-700',
  posted: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-canvas text-ink-faint',
  cancelled: 'bg-rose-50 text-rose-600',
  rejected: 'bg-rose-50 text-rose-600',
  reversed: 'bg-purple-50 text-purple-600',
}[status] || 'bg-canvas text-ink-faint')

const attentionItems = computed(() => [
  { label: 'Requisitions awaiting approval', value: metrics.requisitionApprovals, to: '/supply-chain/operations?tab=requisitions', icon: 'document-text', tone: 'text-amber-600 bg-amber-50' },
  { label: 'Orders awaiting approval', value: metrics.orderApprovals, to: '/supply-chain/operations?tab=orders', icon: 'credit-card', tone: 'text-primary bg-primary-soft' },
  { label: 'Orders open for receipt', value: metrics.openOrders, to: '/supply-chain/operations?tab=orders', icon: 'arrow-path', tone: 'text-blue-600 bg-blue-50' },
  { label: 'Draft receipts to post', value: metrics.draftReceipts, to: '/supply-chain/operations?tab=receipts', icon: 'cube', tone: 'text-purple-600 bg-purple-50' },
])

watch(unitId, () => {
  Object.assign(metrics, { requisitions: 0, requisitionApprovals: 0, orders: 0, orderApprovals: 0, openOrders: 0, receipts: 0, draftReceipts: 0 })
  recentRequisitions.value = []
  recentOrders.value = []
  recentReceipts.value = []
  void loadDashboard()
})
onMounted(loadUnits)
</script>

<template>
  <div class="space-y-8" :aria-busy="loading">
    <PageHeader title="Supply chain" subtitle="Procurement status, approval queues and inbound delivery activity." icon="home">
      <BaseButton variant="secondary" icon="arrow-path" :disabled="!unitId || loading" @click="loadDashboard">
        {{ loading ? 'Refreshing…' : 'Refresh' }}
      </BaseButton>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4">
      <span class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Accounting unit</span>
      <SelectInput v-model="unitId" :options="unitOptions" placeholder="Select a unit" class="max-w-sm" />
      <span v-if="loadingUnits" class="text-xs text-ink-faint">Loading units…</span>
    </div>

    <p v-if="error" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ error }}</p>
    <p v-else-if="!loadingUnits && !units.length" role="alert" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
      Supply chain needs at least one accounting unit. Create one under General Ledger → Accounting Units.
    </p>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard label="Purchase requisitions" :value="metrics.requisitions" icon="document-text" tone="primary" hint="All requisitions" />
      <StatCard label="Requisition approvals" :value="metrics.requisitionApprovals" icon="information-circle" tone="amber" hint="Awaiting review" />
      <StatCard label="Purchase orders" :value="metrics.orders" icon="credit-card" tone="blue" hint="All supplier orders" />
      <StatCard label="Open purchase orders" :value="metrics.openOrders" icon="arrow-path" tone="purple" hint="Approved, sent or partly received" />
      <StatCard label="Goods receipts" :value="metrics.receipts" icon="cube" tone="green" hint="All inbound receipts" />
      <StatCard label="Unposted receipts" :value="metrics.draftReceipts" icon="document-text" tone="red" hint="Draft stock postings" />
    </div>

    <section>
      <div class="mb-3">
        <h2 class="text-sm font-semibold text-ink">Needs attention</h2>
        <p class="mt-1 text-xs text-ink-faint">Open the relevant workspace to keep procurement moving.</p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <NuxtLink v-for="item in attentionItems" :key="item.label" :to="item.to" class="group rounded-xl border border-line bg-surface p-4 transition hover:border-primary hover:shadow-sm">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" :class="item.tone"><AppIcon :name="item.icon" :size="19" /></span>
            <div class="min-w-0">
              <p class="text-2xl font-bold text-ink tnum">{{ item.value }}</p>
              <p class="mt-0.5 text-xs text-ink-faint">{{ item.label }}</p>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-line bg-surface">
      <div class="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 class="text-sm font-semibold text-ink">Recent purchase orders</h2>
          <p class="mt-1 text-xs text-ink-faint">Latest supplier commitments for this accounting unit.</p>
        </div>
        <NuxtLink to="/supply-chain/operations?tab=orders" class="text-xs font-medium text-primary hover:underline">View all</NuxtLink>
      </div>
      <DataTable
        :columns="[
          { key: 'orderNumber', label: 'Order' },
          { key: 'supplierName', label: 'Supplier' },
          { key: 'orderDate', label: 'Order date' },
          { key: 'expectedDeliveryDate', label: 'Expected' },
          { key: 'grandTotal', label: 'Total', align: 'right' },
          { key: 'status', label: 'Status' },
        ]"
        :rows="(recentOrders) as any[]"
        :loading="loading"
        empty="No purchase orders yet. Open Purchase orders to create the first one."
      >
        <template #cell="{ col, row }">
          <span v-if="col.key === 'orderNumber'" class="font-medium text-ink">{{ row.orderNumber }}</span>
          <template v-else-if="col.key === 'orderDate'">{{ row.orderDate ? formatDate(row.orderDate) : '—' }}</template>
          <template v-else-if="col.key === 'expectedDeliveryDate'">{{ row.expectedDeliveryDate ? formatDate(row.expectedDeliveryDate) : '—' }}</template>
          <template v-else-if="col.key === 'grandTotal'">{{ row.currencyCode }} {{ formatDecimalAmount(row.grandTotal ?? '0') }}</template>
          <span v-else-if="col.key === 'status'" class="rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize" :class="statusChip(row.status)">{{ row.status.replaceAll('_', ' ') }}</span>
          <template v-else>{{ row[col.key] || '—' }}</template>
        </template>
      </DataTable>
    </section>

    <div class="grid gap-5 xl:grid-cols-2">
      <section class="rounded-xl border border-line bg-surface">
        <div class="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 class="text-sm font-semibold text-ink">Recent requisitions</h2>
          <NuxtLink to="/supply-chain/operations?tab=requisitions" class="text-xs font-medium text-primary hover:underline">View all</NuxtLink>
        </div>
        <ul class="divide-y divide-line/60">
          <li v-for="req in recentRequisitions" :key="req.id" class="flex items-center gap-3 px-5 py-3">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-ink">{{ req.requisitionNumber }}</p>
              <p class="mt-0.5 truncate text-xs text-ink-faint">{{ req.warehouseName || req.purpose || formatDate(req.requestDate) }}</p>
            </div>
            <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize" :class="statusChip(req.status)">{{ req.status.replaceAll('_', ' ') }}</span>
          </li>
          <li v-if="!loading && !recentRequisitions.length" class="px-5 py-8 text-center text-sm text-ink-faint">No requisitions yet.</li>
        </ul>
      </section>

      <section class="rounded-xl border border-line bg-surface">
        <div class="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 class="text-sm font-semibold text-ink">Receipt activity</h2>
          <NuxtLink to="/supply-chain/operations?tab=receipts" class="text-xs font-medium text-primary hover:underline">View all</NuxtLink>
        </div>
        <ul class="divide-y divide-line/60">
          <li v-for="receipt in recentReceipts" :key="receipt.id" class="flex items-center gap-3 px-5 py-3">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-ink">{{ receipt.receiptNumber }}</p>
              <p class="mt-0.5 truncate text-xs text-ink-faint">{{ receipt.supplierName || receipt.orderNumber }} · {{ formatDate(receipt.receiptDate) }}</p>
            </div>
            <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize" :class="statusChip(receipt.status)">{{ receipt.status.replaceAll('_', ' ') }}</span>
          </li>
          <li v-if="!loading && !recentReceipts.length" class="px-5 py-8 text-center text-sm text-ink-faint">No goods receipts yet.</li>
        </ul>
      </section>
    </div>

    <section>
      <h2 class="mb-3 text-sm font-semibold text-ink">Workspaces</h2>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <NuxtLink v-for="link in links" :key="link.path" :to="link.path" class="rounded-xl border border-line bg-surface p-4 transition hover:border-primary hover:shadow-sm">
          <div class="flex items-center gap-2 font-semibold text-ink"><AppIcon :name="link.icon" :size="17" class="text-primary" />{{ link.title }}</div>
          <p class="mt-2 text-sm text-ink-faint">{{ link.description }}</p>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
