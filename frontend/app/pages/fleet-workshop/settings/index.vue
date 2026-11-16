<script setup lang="ts">
import { useFleetUnitId, useFleetWorkshop } from '../../../features/fleet-workshop/useFleetWorkshop'
import type { CrossModuleLinkRecord, GlSettingsOptions } from '../../../features/fleet-workshop/fleet-types'
import FleetSelect from '../../../features/fleet-workshop/components/FleetSelect.vue'
import { fleetErrorMessage, fleetStatusTone, humanLabel } from '../../../features/fleet-workshop/fleet-helpers'

definePageMeta({ layout: 'admin-fleet' })
useHead({ title: 'Fleet GL settings & handoffs' })

const api = useFleetWorkshop()
const unitId = useFleetUnitId()
const toast = useToast()

const activeTab = ref<'settings' | 'handoffs'>('settings')
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const options = ref<GlSettingsOptions>({ accountingUnitId: '', accounts: [], warehouses: [] })
const accountOpts = computed(() => options.value.accounts.map((a) => ({ value: a.id, label: `${a.accountNumber} — ${a.name}` })))
const warehouseOpts = computed(() => options.value.warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` })))

const form = reactive({
  defaultWarehouseId: '',
  repairsExpenseAccountId: '',
  fuelExpenseAccountId: '',
  lubricantsExpenseAccountId: '',
  tyresExpenseAccountId: '',
  outsourcedRepairsExpenseAccountId: '',
  electricalExpenseAccountId: '',
  internalLabourRecoveryAccountId: '',
  workshopLabourRevenueAccountId: '',
  workshopPartsRevenueAccountId: '',
  workshopWipAccountId: '',
  fleetClearingApAccountId: '',
  fleetReceivableArAccountId: '',
  defaultLabourRate: '0',
  defaultTaxRate: '0',
})

const links = ref<CrossModuleLinkRecord[]>([])
const linkTotal = ref(0)
const linkPage = ref(1)
const moduleFilter = ref('')
const statusFilter = ref('')

async function load() {
  if (!unitId.value) return
  loading.value = true
  error.value = ''
  try {
    if (activeTab.value === 'settings') {
      const [optRes, cur] = await Promise.all([
        api.glSettings.options(unitId.value),
        api.glSettings.get(unitId.value),
      ])
      options.value = optRes
      Object.assign(form, {
        defaultWarehouseId: cur.defaultWarehouseId || '',
        repairsExpenseAccountId: cur.repairsExpenseAccountId || '',
        fuelExpenseAccountId: cur.fuelExpenseAccountId || '',
        lubricantsExpenseAccountId: cur.lubricantsExpenseAccountId || '',
        tyresExpenseAccountId: cur.tyresExpenseAccountId || '',
        outsourcedRepairsExpenseAccountId: cur.outsourcedRepairsExpenseAccountId || '',
        electricalExpenseAccountId: cur.electricalExpenseAccountId || '',
        internalLabourRecoveryAccountId: cur.internalLabourRecoveryAccountId || '',
        workshopLabourRevenueAccountId: cur.workshopLabourRevenueAccountId || '',
        workshopPartsRevenueAccountId: cur.workshopPartsRevenueAccountId || '',
        workshopWipAccountId: cur.workshopWipAccountId || '',
        fleetClearingApAccountId: cur.fleetClearingApAccountId || '',
        fleetReceivableArAccountId: cur.fleetReceivableArAccountId || '',
        defaultLabourRate: cur.defaultLabourRate || '0',
        defaultTaxRate: cur.defaultTaxRate || '0',
      })
    } else {
      const res = await api.moduleLinks.list({
        targetModule: moduleFilter.value || undefined,
        handoffStatus: statusFilter.value || undefined,
        page: linkPage.value,
        size: 25,
      })
      links.value = res.items
      linkTotal.value = res.total
    }
  } catch (e) {
    error.value = fleetErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch([unitId, activeTab, moduleFilter, statusFilter, linkPage], load)
onMounted(load)

async function saveSettings() {
  if (!unitId.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    await api.glSettings.save({
      accountingUnitId: unitId.value,
      defaultWarehouseId: form.defaultWarehouseId || null,
      repairsExpenseAccountId: form.repairsExpenseAccountId || null,
      fuelExpenseAccountId: form.fuelExpenseAccountId || null,
      lubricantsExpenseAccountId: form.lubricantsExpenseAccountId || null,
      tyresExpenseAccountId: form.tyresExpenseAccountId || null,
      outsourcedRepairsExpenseAccountId: form.outsourcedRepairsExpenseAccountId || null,
      electricalExpenseAccountId: form.electricalExpenseAccountId || null,
      internalLabourRecoveryAccountId: form.internalLabourRecoveryAccountId || null,
      workshopLabourRevenueAccountId: form.workshopLabourRevenueAccountId || null,
      workshopPartsRevenueAccountId: form.workshopPartsRevenueAccountId || null,
      workshopWipAccountId: form.workshopWipAccountId || null,
      fleetClearingApAccountId: form.fleetClearingApAccountId || null,
      fleetReceivableArAccountId: form.fleetReceivableArAccountId || null,
      defaultLabourRate: String(form.defaultLabourRate || '0'),
      defaultTaxRate: String(form.defaultTaxRate || '0'),
    })
    toast.success('Fleet GL & default settings saved')
  } catch (e) {
    error.value = fleetErrorMessage(e)
  } finally {
    saving.value = false
  }
}

const linkCols = [
  { key: 'createdAt', label: 'Timestamp' },
  { key: 'sourceEntityType', label: 'Source' },
  { key: 'targetModule', label: 'Target module / Kind' },
  { key: 'targetReference', label: 'Reference' },
  { key: 'amount', label: 'Amount', align: 'right' as const },
  { key: 'handoffStatus', label: 'Handoff status' },
]
</script>

<template>
  <section class="space-y-5">
    <PageHeader title="Fleet GL settings & module handoffs" subtitle="Configure per-unit Fleet expense, WIP, recovery, revenue and clearing GL accounts, and inspect ERP module handoffs." icon="cog-6-tooth" />

    <div class="rounded-2xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <div class="flex gap-1.5">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold"
            :class="activeTab === 'settings' ? 'bg-primary text-white' : 'bg-canvas text-ink-soft'"
            @click="activeTab = 'settings'"
          >
            GL &amp; Default Warehouse Settings
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold"
            :class="activeTab === 'handoffs' ? 'bg-primary text-white' : 'bg-canvas text-ink-soft'"
            @click="activeTab = 'handoffs'"
          >
            Cross-Module Handoff Queue
          </button>
        </div>
      </div>

      <p v-if="error" role="alert" class="p-4 text-sm text-rose-600">{{ error }}</p>

      <form v-if="activeTab === 'settings'" class="space-y-5 p-5" @submit.prevent="saveSettings">
        <div class="grid gap-4 sm:grid-cols-3">
          <FormField label="Default parts / fuel warehouse"><FleetSelect v-model="form.defaultWarehouseId" :options="warehouseOpts" placeholder="None" /></FormField>
          <FormField label="Default workshop labour rate"><TextInput v-model="form.defaultLabourRate" type="number" step="any" /></FormField>
          <FormField label="Default tax rate (fraction e.g. 0.15)"><TextInput v-model="form.defaultTaxRate" type="number" step="any" /></FormField>
          <FormField label="Repairs & maintenance expense"><FleetSelect v-model="form.repairsExpenseAccountId" :options="accountOpts" placeholder="None" /></FormField>
          <FormField label="Fuel expense account"><FleetSelect v-model="form.fuelExpenseAccountId" :options="accountOpts" placeholder="None" /></FormField>
          <FormField label="Lubricants expense account"><FleetSelect v-model="form.lubricantsExpenseAccountId" :options="accountOpts" placeholder="None" /></FormField>
          <FormField label="Tyres expense account"><FleetSelect v-model="form.tyresExpenseAccountId" :options="accountOpts" placeholder="None" /></FormField>
          <FormField label="Outsourced repairs expense"><FleetSelect v-model="form.outsourcedRepairsExpenseAccountId" :options="accountOpts" placeholder="None" /></FormField>
          <FormField label="Electrical services expense"><FleetSelect v-model="form.electricalExpenseAccountId" :options="accountOpts" placeholder="None" /></FormField>
          <FormField label="Internal labour recovery"><FleetSelect v-model="form.internalLabourRecoveryAccountId" :options="accountOpts" placeholder="None" /></FormField>
          <FormField label="Workshop labour revenue"><FleetSelect v-model="form.workshopLabourRevenueAccountId" :options="accountOpts" placeholder="None" /></FormField>
          <FormField label="Workshop parts revenue"><FleetSelect v-model="form.workshopPartsRevenueAccountId" :options="accountOpts" placeholder="None" /></FormField>
          <FormField label="Workshop WIP account"><FleetSelect v-model="form.workshopWipAccountId" :options="accountOpts" placeholder="None" /></FormField>
          <FormField label="Fleet clearing (AP)"><FleetSelect v-model="form.fleetClearingApAccountId" :options="accountOpts" placeholder="None" /></FormField>
          <FormField label="Fleet receivable (AR)"><FleetSelect v-model="form.fleetReceivableArAccountId" :options="accountOpts" placeholder="None" /></FormField>
        </div>
        <div class="flex justify-end border-t border-line pt-4">
          <BaseButton type="submit" :loading="saving">Save GL settings</BaseButton>
        </div>
      </form>

      <div v-else>
        <div class="flex flex-wrap gap-3 border-b border-line p-4">
          <div class="w-56">
            <FleetSelect
              v-model="moduleFilter"
              :options="[
                { value: 'inventory', label: 'Inventory' },
                { value: 'gl', label: 'General Ledger' },
                { value: 'supply_chain', label: 'Supply Chain' },
                { value: 'fixed_assets', label: 'Fixed Assets' },
                { value: 'ap', label: 'Accounts Payable' },
                { value: 'ar', label: 'Accounts Receivable' },
                { value: 'point_of_sale', label: 'Point of Sale' },
                { value: 'project_management', label: 'Project Management' },
              ]"
              placeholder="All target modules"
            />
          </div>
          <div class="w-48">
            <FleetSelect
              v-model="statusFilter"
              :options="[
                { value: 'staged', label: 'Staged' },
                { value: 'posted', label: 'Posted' },
                { value: 'failed', label: 'Failed' },
              ]"
              placeholder="All statuses"
            />
          </div>
        </div>
        <DataTable :columns="linkCols" :rows="links" :loading="loading" empty="No cross-module handoffs recorded yet.">
          <template #cell="{ col, row }">
            <template v-if="col.key === 'createdAt'">{{ row.createdAt ? formatDate(row.createdAt) : '—' }}</template>
            <template v-else-if="col.key === 'sourceEntityType'">{{ humanLabel(row.sourceEntityType) }}</template>
            <template v-else-if="col.key === 'targetModule'">
              <div class="font-medium">{{ humanLabel(row.targetModule) }}</div>
              <div class="text-[11px] text-ink-faint">{{ humanLabel(row.linkKind) }}</div>
            </template>
            <template v-else-if="col.key === 'amount'"><span class="tnum font-medium">{{ formatCurrency(row.amount) }}</span></template>
            <template v-else-if="col.key === 'handoffStatus'">
              <span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold" :class="fleetStatusTone(row.handoffStatus)">{{ humanLabel(row.handoffStatus) }}</span>
            </template>
          </template>
        </DataTable>
        <div class="border-t border-line p-4">
          <Pagination v-model:page="linkPage" :size="25" :total="linkTotal" />
        </div>
      </div>
    </div>
  </section>
</template>
