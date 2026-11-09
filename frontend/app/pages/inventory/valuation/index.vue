<script setup lang="ts">
import { useInventory, useInventoryUnitId } from '../../../features/inventory/useInventory'
import type { PeriodCloseRecord, SnapshotRecord } from '../../../features/inventory/inventory-types'

definePageMeta({ layout: 'admin-inventory' })
useHead({ title: 'Valuation & period close' })

const api = useInventory()
const unitId = useInventoryUnitId()
const request = useRequestFetch()
const message = (e: any) => e?.data?.statusMessage || e?.statusMessage || 'Request failed. Please retry.'
const today = () => new Date().toISOString().slice(0, 10)

/* ------------------------------- snapshots ----------------------------------- */
const snapshots = ref<SnapshotRecord[]>([])
const snapTotal = ref(0)
const snapPage = ref(1)
const snapLoading = ref(false)
const snapError = ref('')
const showCapture = ref(false)
const capture = reactive({ asOfDate: today(), notes: '' })
const capturing = ref(false)
const captureError = ref('')
const captureResult = ref('')

async function loadSnapshots() {
  if (!unitId.value) return
  snapLoading.value = true
  snapError.value = ''
  try {
    const r = await api.snapshots.list(unitId.value, snapPage.value, 20)
    snapshots.value = r.items
    snapTotal.value = r.total
  } catch (e) {
    snapshots.value = []
    snapError.value = message(e)
  } finally {
    snapLoading.value = false
  }
}

async function captureSnapshot() {
  if (capturing.value || !unitId.value) return
  capturing.value = true
  captureError.value = ''
  try {
    const r = await api.snapshots.capture({ accountingUnitId: unitId.value, asOfDate: capture.asOfDate, notes: capture.notes.trim() })
    captureResult.value = `Captured ${r.itemCount} items: ${r.totalQuantity} units, value ${r.totalValue}.`
    showCapture.value = false
    await loadSnapshots()
  } catch (e) {
    captureError.value = message(e)
  } finally {
    capturing.value = false
  }
}

/* ------------------------------- period close -------------------------------- */
interface Period { id: string; period: string; status?: string }
const periods = ref<Period[]>([])
const periodId = ref('')
const year = ref(new Date().getFullYear())
const closes = ref<PeriodCloseRecord[]>([])
const closeError = ref('')
const closeBusy = ref(false)
const preview = ref<PeriodCloseRecord | null>(null)

const periodOptions = computed(() => periods.value.map((p) => ({ value: p.id, label: `${p.period}${p.status ? ` (${p.status})` : ''}` })))

async function loadPeriods() {
  if (!unitId.value) return
  try {
    const r = await request<{ items: Period[] }>('/api/ledger/accounting-periods', { query: { accountingUnitId: unitId.value, year: year.value } })
    periods.value = r.items
    if (!r.items.find((p) => p.id === periodId.value)) periodId.value = ''
  } catch (e) {
    periods.value = []
    closeError.value = message(e)
  }
}

async function loadCloses() {
  if (!unitId.value) return
  try {
    const r = await api.closes.list(unitId.value, 1, 20)
    closes.value = r.items
  } catch (e) {
    closes.value = []
    closeError.value = message(e)
  }
}

// Prepare is a dry run: it lists blockers without sealing the period.
async function prepareClose() {
  if (!unitId.value || !periodId.value) return
  closeBusy.value = true
  closeError.value = ''
  preview.value = null
  try {
    preview.value = await api.closes.prepare({ accountingUnitId: unitId.value, periodId: periodId.value })
  } catch (e) {
    closeError.value = message(e)
  } finally {
    closeBusy.value = false
  }
}

async function sealPeriod() {
  if (!unitId.value || !periodId.value || closeBusy.value) return
  if (!confirm('Seal this period? Stock documents must be posted first.')) return
  closeBusy.value = true
  closeError.value = ''
  try {
    await api.closes.close({ accountingUnitId: unitId.value, periodId: periodId.value })
    preview.value = null
    await Promise.all([loadCloses(), loadPeriods()])
  } catch (e) {
    closeError.value = message(e)
  } finally {
    closeBusy.value = false
  }
}

watch(unitId, () => { snapPage.value = 1; void loadSnapshots(); void loadPeriods(); void loadCloses() })
watch(year, loadPeriods)
watch(snapPage, loadSnapshots)
onMounted(() => { void loadSnapshots(); void loadPeriods(); void loadCloses() })
</script>

<template>
  <section class="space-y-8">
    <PageHeader title="Valuation & period close" subtitle="Capture stock valuation snapshots and seal inventory periods." icon="calendar-days" />

    <div v-if="!unitId" class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:bg-slate-900">Select an accounting unit to continue.</div>

    <template v-else>
      <div class="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 class="text-sm font-semibold">Valuation snapshots</h2>
          <span class="text-sm text-slate-500">{{ snapTotal }} snapshot{{ snapTotal === 1 ? '' : 's' }}</span>
          <div class="ml-auto"><BaseButton icon="plus" @click="showCapture = true">Capture snapshot</BaseButton></div>
        </div>
        <p v-if="captureResult" class="px-4 pt-3 text-sm text-emerald-700">{{ captureResult }}</p>
        <p v-if="snapError" class="p-4 text-sm text-red-600">{{ snapError }}</p>
        <DataTable
          :columns="[{ key: 'asOfDate', label: 'As of' }, { key: 'status', label: 'Status' }, { key: 'itemCount', label: 'Items', align: 'right' }, { key: 'totalQuantity', label: 'Quantity', align: 'right' }, { key: 'totalValue', label: 'Value', align: 'right' }, { key: 'notes', label: 'Notes' }]"
          :rows="snapshots"
          :loading="snapLoading"
          empty="No snapshots captured yet."
        />
        <div class="border-t border-slate-200 p-4 dark:border-slate-800"><Pagination v-model:page="snapPage" :size="20" :total="snapTotal" /></div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div class="flex flex-wrap items-end gap-3">
          <FormField label="Year" class="w-32"><TextInput v-model="year" type="number" /></FormField>
          <FormField label="Period" class="min-w-[220px]"><SelectInput v-model="periodId" :options="periodOptions" placeholder="Select a period" /></FormField>
          <BaseButton variant="secondary" :disabled="!periodId || closeBusy" @click="prepareClose">Check blockers</BaseButton>
          <BaseButton variant="danger" :disabled="!periodId || closeBusy" @click="sealPeriod">Seal period</BaseButton>
        </div>
        <p v-if="closeError" class="text-sm text-red-600">{{ closeError }}</p>
        <div v-if="preview" class="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
          <p class="font-semibold">{{ preview.period || 'Period' }}: {{ preview.status }}</p>
          <p class="text-slate-500">Posted documents: {{ preview.documentsPosted ?? 0 }} · Pending: {{ preview.documentsPending ?? 0 }}</p>
          <ul v-if="preview.blockers?.length" class="mt-2 list-disc pl-5 text-red-600">
            <li v-for="b in preview.blockers" :key="b.type">{{ b.type.replace(/_/g, ' ') }}: {{ b.count }}</li>
          </ul>
          <p v-else class="mt-2 text-emerald-700">No blockers. The period can be sealed.</p>
        </div>
        <DataTable
          :columns="[{ key: 'period', label: 'Period' }, { key: 'status', label: 'Status' }, { key: 'documentsPosted', label: 'Posted', align: 'right' }, { key: 'documentsPending', label: 'Pending', align: 'right' }, { key: 'closedAt', label: 'Closed' }]"
          :rows="closes"
          empty="No period closes yet."
        />
      </div>
    </template>

    <ModalShell :open="showCapture" title="Capture valuation snapshot" @close="showCapture = false">
      <form class="space-y-4" @submit.prevent="captureSnapshot">
        <FormField label="As of date" required><TextInput v-model="capture.asOfDate" type="date" /></FormField>
        <FormField label="Notes"><TextInput v-model="capture.notes" /></FormField>
        <p v-if="captureError" class="text-sm text-red-600">{{ captureError }}</p>
        <div class="flex justify-end gap-2">
          <BaseButton variant="secondary" @click="showCapture = false">Cancel</BaseButton>
          <BaseButton type="submit" :disabled="capturing">{{ capturing ? 'Capturing…' : 'Capture' }}</BaseButton>
        </div>
      </form>
    </ModalShell>
  </section>
</template>
