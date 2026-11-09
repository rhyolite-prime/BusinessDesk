<script setup lang="ts">
import { useInventory, useInventoryUnitId } from '../../features/inventory/useInventory'
import { emptyDashboard, type InventoryDashboard } from '../../features/inventory/inventory-types'
import { inventoryPages } from '../../features/inventory/navigation'

definePageMeta({ layout: 'admin-inventory' })
useHead({ title: 'Inventory' })

const api = useInventory()
const unitId = useInventoryUnitId()
const dash = ref<InventoryDashboard>(emptyDashboard())
const loading = ref(false)
const error = ref('')

async function load() {
  if (!unitId.value) return
  loading.value = true
  error.value = ''
  try {
    dash.value = await api.dashboard(unitId.value)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not load the inventory summary.'
  } finally {
    loading.value = false
  }
}
watch(unitId, load)
onMounted(load)

const links = inventoryPages.filter((p) => p.path !== '/inventory')
</script>

<template>
  <section class="space-y-8">
    <PageHeader title="Inventory" subtitle="Stock, movements and period health for the selected accounting unit." icon="cube" />

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Stock value" :value="dash.stockValue ? formatCurrency(dash.stockValue) : '—'" icon="scale" tone="green" />
      <StatCard label="Items" :value="dash.items ?? 0" icon="cube" tone="primary" />
      <StatCard label="Pending documents" :value="dash.pendingDocuments ?? 0" icon="document-text" tone="amber" />
      <StatCard label="Low-stock items" :value="dash.lowStockItems ?? 0" icon="information-circle" tone="red" />
      <StatCard label="Active warehouses" :value="dash.activeWarehouses ?? 0" icon="building-office" tone="blue" />
      <StatCard label="Movements (30 days)" :value="dash.movements30d ?? 0" icon="arrow-path" tone="purple" />
      <StatCard label="Batches expiring (30 days)" :value="dash.batchesExpiring30d ?? 0" icon="tag" tone="amber" />
    </div>

    <div>
      <h2 class="mb-3 text-sm font-semibold">Workspaces</h2>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <NuxtLink v-for="link in links" :key="link.path" :to="link.path" class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary dark:border-slate-800 dark:bg-slate-900">
          <div class="font-semibold">{{ link.title }}</div>
          <p class="mt-1 text-sm text-slate-500">{{ link.description }}</p>
        </NuxtLink>
      </div>
      <p v-if="whError" role="alert" class="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ whError }}</p>
      <DataTable
        :columns="[
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Name' },
          { key: 'warehouseType', label: 'Type' },
          { key: 'allowNegativeStock', label: 'Negative stock' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: '', align: 'right' },
        ]"
        :rows="(whRows) as any[]"
        :loading="whLoading"
        empty="No warehouses yet — create one to start moving stock."
      >
        <template #cell="{ col, row }">
          <template v-if="col.key === 'name'"><span class="font-medium text-ink">{{ row.name }}</span></template>
          <template v-else-if="col.key === 'warehouseType'"><span class="capitalize">{{ row.warehouseType || 'physical' }}</span></template>
          <template v-else-if="col.key === 'allowNegativeStock'">{{ row.allowNegativeStock ? 'Allowed' : 'Blocked' }}</template>
          <template v-else-if="col.key === 'status'">
            <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="row.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-canvas text-ink-faint'">{{ row.isActive !== false ? 'Active' : 'Inactive' }}</span>
          </template>
          <template v-else-if="col.key === 'actions'">
            <button class="mr-1 rounded-lg p-2 text-ink-faint hover:bg-canvas" aria-label="Edit warehouse" @click="openWhEdit(row)"><AppIcon name="pencil-square" :size="15" /></button>
            <button class="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="Delete warehouse" @click="deleteError = ''; deleteTarget = { kind: 'warehouse', id: row.id, version: row.version || 1, label: `${row.code} — ${row.name}` }"><AppIcon name="x-mark" :size="15" /></button>
          </template>
          <template v-else>{{ row[col.key] }}</template>
        </template>
      </DataTable>
    </section>

    <!-- Item form -->
    <ModalShell :open="showItemForm" :title="editingItem ? 'Edit item' : 'New item'" width="max-w-2xl" @close="!itemSaving && (showItemForm = false)">
      <form @submit.prevent="saveItem">
        <fieldset :disabled="itemSaving" class="grid gap-4 sm:grid-cols-2">
          <FormField label="Item code" required><TextInput v-model="itemForm.itemCode" placeholder="SKU-001" /></FormField>
          <FormField label="Name" required><TextInput v-model="itemForm.name" placeholder="Widget" /></FormField>
          <FormField label="Category"><SelectInput v-model="itemForm.itemCategoryId" :options="[{ value: '', label: 'Uncategorized' }, ...itemOptions.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))]" /></FormField>
          <FormField label="Base UOM" required><SelectInput v-model="itemForm.baseUomId" :options="uoms.map((u) => ({ value: u.id, label: `${u.code} — ${u.name}` }))" placeholder="Select UOM" /></FormField>
          <FormField label="Item type" required><SelectInput v-model="itemForm.itemType" :options="['stock', 'non_stock', 'service', 'kit'].map((v) => ({ value: v, label: v.replace('_', ' ') }))" /></FormField>
          <FormField label="Tracking" required><SelectInput v-model="itemForm.trackingMethod" :options="[{ value: 'none', label: 'Not tracked' }, { value: 'batch', label: 'Batch / lot' }, { value: 'serial', label: 'Serial numbers' }]" /></FormField>
          <FormField label="Valuation method" required><SelectInput v-model="itemForm.valuationMethod" :options="[{ value: 'weighted_average', label: 'Weighted average' }, { value: 'fifo', label: 'FIFO (first in, first out)' }, { value: 'standard', label: 'Standard cost' }]" /></FormField>
          <FormField label="Purchasing"><SelectInput :model-value="itemForm.isPurchasable ? 'yes' : 'no'" :options="[{ value: 'yes', label: 'Purchasable' }, { value: 'no', label: 'Not purchasable' }]" @update:model-value="itemForm.isPurchasable = $event === 'yes'" /></FormField>
          <p v-if="itemFormError" role="alert" class="sm:col-span-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ itemFormError }}</p>
          <footer class="sm:col-span-2 flex justify-end gap-3 border-t border-line pt-4">
            <BaseButton variant="secondary" type="button" @click="showItemForm = false">Cancel</BaseButton>
            <BaseButton type="submit" :disabled="itemSaving || !itemForm.baseUomId">{{ itemSaving ? 'Saving…' : editingItem ? 'Save changes' : 'Create item' }}</BaseButton>
          </footer>
        </fieldset>
      </form>
    </ModalShell>

    <!-- Warehouse form -->
    <ModalShell :open="showWhForm" :title="editingWh ? 'Edit warehouse' : 'New warehouse'" @close="!whSaving && (showWhForm = false)">
      <form @submit.prevent="saveWarehouse">
        <fieldset :disabled="whSaving" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <FormField label="Code" required><TextInput v-model="whForm.code" placeholder="MAIN" /></FormField>
            <FormField label="Name" required><TextInput v-model="whForm.name" placeholder="Main store" /></FormField>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <FormField label="Type" required><SelectInput v-model="whForm.warehouseType" :options="['physical', 'transit', 'quarantine', 'virtual'].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))" /></FormField>
            <FormField label="Address"><TextInput v-model="whForm.address" placeholder="Optional location" /></FormField>
          </div>
          <div class="flex flex-wrap gap-6">
            <label class="flex items-center gap-2 text-sm"><input v-model="whForm.isActive" type="checkbox" class="h-4 w-4 rounded border-line" /> Active</label>
            <label class="flex items-center gap-2 text-sm"><input v-model="whForm.allowNegativeStock" type="checkbox" class="h-4 w-4 rounded border-line" /> Allow negative stock</label>
          </div>
          <p v-if="whFormError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ whFormError }}</p>
          <footer class="flex justify-end gap-3 border-t border-line pt-4">
            <BaseButton variant="secondary" type="button" @click="showWhForm = false">Cancel</BaseButton>
            <BaseButton type="submit" :disabled="whSaving">{{ whSaving ? 'Saving…' : editingWh ? 'Save changes' : 'Create warehouse' }}</BaseButton>
          </footer>
        </fieldset>
      </form>
    </ModalShell>

    <!-- Document wizard -->
    <ModalShell :open="showDocForm" title="New stock document" width="max-w-3xl" @close="!docSaving && (showDocForm = false)">
      <form @submit.prevent="saveDocument">
        <fieldset :disabled="docSaving" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-3">
            <FormField label="Document type" required>
              <SelectInput v-model="docForm.documentType" :options="[{ value: 'receipt', label: 'Receipt (stock in)' }, { value: 'issue', label: 'Issue (stock out)' }, { value: 'transfer', label: 'Warehouse transfer' }, { value: 'adjustment', label: 'Adjustment' }, { value: 'count', label: 'Stock count' }]" />
            </FormField>
            <FormField label="Movement reason" required>
              <SelectInput v-model="docForm.movementReason" :options="docReasons[docForm.documentType] || []" />
            </FormField>
            <FormField label="Document date" required><TextInput v-model="docForm.documentDate" type="date" /></FormField>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <FormField :label="docForm.documentType === 'transfer' ? 'Source warehouse' : 'Warehouse'" required>
              <SelectInput v-model="docForm.sourceWarehouseId" :options="whRows.filter((w) => w.isActive !== false).map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))" placeholder="Select warehouse" />
            </FormField>
            <FormField v-if="docForm.documentType === 'transfer'" label="Destination warehouse" required>
              <SelectInput v-model="docForm.destinationWarehouseId" :options="whRows.filter((w) => w.isActive !== false && w.id !== docForm.sourceWarehouseId).map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))" placeholder="Select warehouse" />
            </FormField>
            <FormField label="Document number" hint="Preview only — the number is reserved when the draft is created.">
              <TextInput :model-value="docForm.number" disabled placeholder="Assigned on save" />
            </FormField>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <FormField label="Reference"><TextInput v-model="docForm.referenceNumber" placeholder="Supplier invoice, delivery note…" /></FormField>
            <FormField label="Notes"><TextInput v-model="docForm.notes" placeholder="Optional" /></FormField>
          </div>

          <div class="rounded-xl border border-line">
            <header class="flex items-center justify-between border-b border-line px-4 py-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Lines</p>
              <BaseButton size="sm" variant="secondary" icon="plus" :disabled="!pickerItems.length || docLines.length >= 200" @click="addDocLine">Add line</BaseButton>
            </header>
            <table class="w-full text-sm">
              <thead><tr class="border-b border-line text-left text-[11px] uppercase text-ink-faint">
                <th class="px-3 py-2">Item</th>
                <th class="px-3 py-2 w-28">Quantity</th>
                <th class="px-3 py-2 w-32">Unit cost</th>
                <th class="px-3 py-2">Serials / notes</th>
                <th class="px-3 py-2 w-10" />
              </tr></thead>
              <tbody>
                <tr v-for="(line, index) in docLines" :key="index" class="border-b border-line/60 align-top">
                  <td class="px-3 py-2">
                    <SelectInput :model-value="line.itemId" :options="pickerItems.map((i) => ({ value: i.id, label: `${i.itemCode} — ${i.name}` }))" @update:model-value="setDocLineItem(line, String($event))" />
                  </td>
                  <td class="px-3 py-2"><TextInput v-model="line.quantity" type="number" min="0" step="any" /></td>
                  <td class="px-3 py-2"><TextInput :model-value="line.unitCost ?? ''" type="number" min="0" step="any" placeholder="auto" @update:model-value="line.unitCost = $event" /></td>
                  <td class="px-3 py-2">
                    <TextInput v-if="lineIsSerial(line)" :model-value="lineSerials(line)" placeholder="Comma-separated serial numbers" @update:model-value="setLineSerials(line, $event)" />
                    <TextInput v-else :model-value="line.description ?? ''" placeholder="Optional note" @update:model-value="line.description = $event" />
                  </td>
                  <td class="px-3 py-2 text-right"><button type="button" class="rounded p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Remove line" :disabled="docLines.length <= 1" @click="docLines.splice(index, 1)"><AppIcon name="x-mark" :size="14" /></button></td>
                </tr>
              </tbody>
            </table>
            <p v-if="!pickerItems.length" class="px-4 py-3 text-xs text-amber-700">No active purchasable items in this unit yet — create items first.</p>
          </div>

          <p v-if="docFormError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ docFormError }}</p>
          <footer class="flex justify-end gap-3 border-t border-line pt-4">
            <BaseButton variant="secondary" type="button" @click="showDocForm = false">Cancel</BaseButton>
            <BaseButton type="submit" :disabled="docSaving || !docForm.sourceWarehouseId || !docLines.length">{{ docSaving ? 'Saving…' : 'Create draft' }}</BaseButton>
          </footer>
        </fieldset>
      </form>
    </ModalShell>

    <!-- Document detail -->
    <ModalShell :open="showDocDetail" :title="docDetail ? `${docDetail.documentNumber} — ${docDetail.documentType}` : 'Stock document'" width="max-w-3xl" @close="showDocDetail = false">
      <div v-if="docDetail" class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <span class="rounded-full px-2.5 py-1 text-xs font-semibold capitalize" :class="docStatusChip(docDetail.status)">{{ docDetail.status }}</span>
          <span class="text-xs text-ink-faint">{{ docDetail.movementReason?.replaceAll('_', ' ') }} · {{ docDetail.documentDate }}</span>
          <span class="text-xs text-ink-faint">{{ docDetail.sourceWarehouse }}<template v-if="docDetail.destinationWarehouse"> → {{ docDetail.destinationWarehouse }}</template></span>
          <span class="ml-auto text-sm font-semibold text-ink">{{ docDetail.currencyCode || '' }} {{ formatDecimalAmount(docDetail.totalValue ?? '0') }}</span>
        </div>
        <p v-if="docDetail.referenceNumber || docDetail.notes" class="text-xs text-ink-faint">
          <template v-if="docDetail.referenceNumber">Reference: {{ docDetail.referenceNumber }}.</template>
          <template v-if="docDetail.notes"> {{ docDetail.notes }}</template>
        </p>
        <DataTable
          :columns="[
            { key: 'lineNumber', label: '#' },
            { key: 'itemCode', label: 'Item' },
            { key: 'quantity', label: 'Quantity', align: 'right' },
            { key: 'unitCost', label: 'Unit cost', align: 'right' },
            { key: 'lineValue', label: 'Value', align: 'right' },
            { key: 'description', label: 'Notes' },
          ]"
          :rows="(docDetail.lines || []) as any[]"
          :loading="docDetailLoading"
          row-key="lineNumber"
          empty="No lines."
        >
          <template #cell="{ col, row }">
            <template v-if="col.key === 'itemCode'"><span class="font-medium text-ink">{{ row.itemCode }}</span> <span class="text-ink-faint">{{ row.itemName }}</span></template>
            <template v-else-if="['quantity', 'unitCost', 'lineValue'].includes(col.key)">{{ formatDecimalAmount(row[col.key] ?? '0') }}</template>
            <template v-else-if="col.key === 'description'">{{ (row.serialNumbers || []).length ? `Serials: ${row.serialNumbers.join(', ')}` : row.description || '' }}</template>
            <template v-else>{{ row[col.key] }}</template>
          </template>
        </DataTable>

        <div v-if="docDetail.events?.length" class="rounded-xl border border-line">
          <p class="border-b border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Workflow history</p>
          <ul class="divide-y divide-line/60">
            <li v-for="event in docDetail.events.slice().reverse()" :key="event.version" class="flex items-center gap-3 px-4 py-2 text-xs">
              <span class="w-24 text-ink-faint">{{ event.createdAt?.slice(0, 16).replace('T', ' ') }}</span>
              <span class="font-medium capitalize text-ink">{{ event.action }}</span>
              <span class="capitalize text-ink-faint">{{ event.previousStatus || '—' }} → {{ event.newStatus }}</span>
              <span v-if="event.reason" class="text-rose-600">{{ event.reason }}</span>
              <span class="ml-auto text-ink-faint">{{ event.actor }}</span>
            </li>
          </ul>
        </div>

        <p v-if="docActionError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ docActionError }}</p>

        <div v-if="reasonPrompt" class="rounded-xl border border-line p-4">
          <FormField :label="`${reasonPrompt.label} — reason`" required>
            <TextInput v-model="reasonText" placeholder="Required (max 500 characters)" />
          </FormField>
          <div class="mt-3 flex justify-end gap-3">
            <BaseButton size="sm" variant="secondary" @click="reasonPrompt = null">Back</BaseButton>
            <BaseButton size="sm" variant="danger" :disabled="docActionBusy || !reasonText.trim()" @click="runDocAction(reasonPrompt.action)">{{ docActionBusy ? 'Working…' : 'Confirm' }}</BaseButton>
          </div>
        </div>

        <footer class="flex items-center justify-end gap-3 border-t border-line pt-4">
          <BaseButton v-if="docDetail.status === 'draft'" variant="danger" :disabled="docActionBusy" @click="deleteError = ''; deleteTarget = { kind: 'document', id: docDetail.id, version: docDetail.version || 1, label: docDetail.documentNumber }">Delete draft</BaseButton>
          <BaseButton v-for="btn in docActions" :key="btn.key" :variant="btn.variant" :disabled="docActionBusy" @click="confirmDocAction(btn.key)">{{ btn.label }}</BaseButton>
        </footer>
      </div>
    </ModalShell>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Delete record"
      :message="`Delete ${deleteTarget?.label ?? 'this record'}? Draft documents and unused records can always be recreated.`"
      confirm-label="Delete"
      tone="danger"
      :loading="deleteBusy"
      @confirm="runDelete"
      @cancel="deleteTarget = null"
    />
    <p v-if="deleteError && !deleteTarget" role="alert" class="fixed bottom-4 right-4 z-[80] rounded-lg bg-rose-600 px-4 py-3 text-sm text-white shadow-lg">{{ deleteError }}</p>
  </div>
</template>
