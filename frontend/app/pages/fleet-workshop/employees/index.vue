<script setup lang="ts">
import { useFleetWorkshop } from '../../../features/fleet-workshop/useFleetWorkshop'
import { useFleetOptions } from '../../../features/fleet-workshop/useFleetOptions'
import type { WorkshopEmployeeRecord } from '../../../features/fleet-workshop/fleet-types'
import FleetSelect from '../../../features/fleet-workshop/components/FleetSelect.vue'
import { SKILL_LEVELS, TRADE_ROLES, fleetErrorMessage, humanLabel } from '../../../features/fleet-workshop/fleet-helpers'

definePageMeta({ layout: 'admin-fleet' })
useHead({ title: 'Workshop technicians & drivers' })

const api = useFleetWorkshop()
const opts = useFleetOptions()
const toast = useToast()

const rows = ref<WorkshopEmployeeRecord[]>([])
const total = ref(0)
const page = ref(1)
const size = 20
const q = ref('')
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await api.employees.list({ q: q.value || undefined, page: page.value, size })
    rows.value = r.items
    total.value = r.total
  } catch (e) {
    error.value = fleetErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch(page, load)
let timer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; void load() }, 250)
})
onMounted(load)

const showModal = ref(false)
const editing = ref<WorkshopEmployeeRecord | null>(null)
const saving = ref(false)
const formError = ref('')

const form = reactive({
  employeeId: '',
  tradeRole: 'mechanic',
  skillLevel: 'journeyman',
  hourlyCostRate: '0',
  hourlyChargeRate: '0',
  currencyId: '',
  bayAssignment: '',
  isActive: true,
  notes: '',
})
const certifications = ref<string[]>([])

function openCreate() {
  editing.value = null
  formError.value = ''
  Object.assign(form, {
    employeeId: '',
    tradeRole: 'mechanic',
    skillLevel: 'journeyman',
    hourlyCostRate: '0',
    hourlyChargeRate: '0',
    currencyId: '',
    bayAssignment: '',
    isActive: true,
    notes: '',
  })
  certifications.value = []
  showModal.value = true
}

async function openEdit(row: WorkshopEmployeeRecord) {
  editing.value = row
  formError.value = ''
  showModal.value = true
  try {
    const full = await api.employees.get(row.id)
    editing.value = full
    Object.assign(form, {
      employeeId: full.employeeId,
      tradeRole: full.tradeRole || 'mechanic',
      skillLevel: full.skillLevel || 'journeyman',
      hourlyCostRate: full.hourlyCostRate || '0',
      hourlyChargeRate: full.hourlyChargeRate || '0',
      currencyId: full.currencyId || '',
      bayAssignment: full.bayAssignment || '',
      isActive: full.isActive !== false,
      notes: full.notes || '',
    })
    certifications.value = Array.isArray(full.certifications)
      ? full.certifications.map((c: any) => (typeof c === 'string' ? c : c?.name || ''))
      : []
  } catch (e) {
    formError.value = fleetErrorMessage(e)
  }
}

function addCert() {
  certifications.value.push('')
}

async function save() {
  if (saving.value) return
  if (!form.employeeId) {
    formError.value = 'Select an HR employee.'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const body = {
      employeeId: form.employeeId,
      tradeRole: form.tradeRole,
      skillLevel: form.skillLevel,
      hourlyCostRate: String(form.hourlyCostRate || '0'),
      hourlyChargeRate: String(form.hourlyChargeRate || '0'),
      currencyId: form.currencyId || null,
      bayAssignment: form.bayAssignment.trim(),
      certifications: certifications.value.map((c) => c.trim()).filter(Boolean),
      isActive: form.isActive,
      notes: form.notes.trim(),
    }
    if (editing.value) {
      await api.employees.update(editing.value.id, { ...body, version: editing.value.version })
      toast.success('Staff profile updated')
    } else {
      await api.employees.create(body)
      toast.success('Workshop staff profile added')
    }
    showModal.value = false
    await Promise.all([load(), opts.loadShared()])
  } catch (e) {
    formError.value = fleetErrorMessage(e)
  } finally {
    saving.value = false
  }
}

const confirmRow = ref<WorkshopEmployeeRecord | null>(null)
const deleting = ref(false)
async function confirmDelete() {
  if (!confirmRow.value || deleting.value) return
  deleting.value = true
  try {
    await api.employees.remove(confirmRow.value.id, confirmRow.value.version)
    confirmRow.value = null
    toast.success('Staff profile removed')
    await load()
  } catch (e) {
    toast.error('Cannot remove staff profile', fleetErrorMessage(e))
  } finally {
    deleting.value = false
  }
}

const columns = [
  { key: 'employeeIdentifier', label: 'HR ID' },
  { key: 'employeeName', label: 'Employee name (HR)' },
  { key: 'tradeRole', label: 'Trade / Bay' },
  { key: 'hourlyCostRate', label: 'Cost / Charge rate' },
  { key: 'isActive', label: 'Status' },
  { key: '_actions', label: '', align: 'right' as const },
]
</script>

<template>
  <section class="space-y-5">
    <PageHeader title="Workshop technicians & drivers" subtitle="Link HR employees to workshop trades, cost/charge rates, bay assignments and certifications." icon="users">
      <template #actions>
        <BaseButton icon="plus" @click="openCreate">Register workshop staff</BaseButton>
      </template>
    </PageHeader>

    <div class="rounded-2xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <TextInput v-model="q" placeholder="Search staff name, HR ID or trade…" class="max-w-xs" />
        <span class="ml-auto text-xs text-ink-faint">{{ total }} registered</span>
      </div>

      <p v-if="error" role="alert" class="p-4 text-sm text-rose-600">{{ error }}</p>

      <DataTable :columns="columns" :rows="rows" :loading="loading" empty="No workshop staff profiles linked yet.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'employeeIdentifier'">
            <span class="font-semibold text-ink">{{ row.employeeIdentifier || '—' }}</span>
          </template>
          <template v-else-if="col.key === 'employeeName'">
            <div class="font-medium">{{ row.employeeName }}</div>
            <div class="text-[11px] text-ink-faint">{{ row.email || row.phone || '—' }}</div>
          </template>
          <template v-else-if="col.key === 'tradeRole'">
            <div>{{ humanLabel(row.tradeRole) }} · {{ humanLabel(row.skillLevel) }}</div>
            <div v-if="row.bayAssignment" class="text-[11px] text-ink-faint">Bay: {{ row.bayAssignment }}</div>
          </template>
          <template v-else-if="col.key === 'hourlyCostRate'">
            <div class="tnum">{{ formatCurrency(row.hourlyCostRate) }} cost</div>
            <div class="text-[11px] text-ink-faint tnum">Charge: {{ formatCurrency(row.hourlyChargeRate) }} / hr</div>
          </template>
          <template v-else-if="col.key === 'isActive'">
            <span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold" :class="row.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'">
              {{ row.isActive ? 'Active' : 'Inactive' }}
            </span>
          </template>
          <div v-else-if="col.key === '_actions'" class="flex justify-end gap-1.5">
            <BaseButton size="sm" variant="ghost" @click="openEdit(row)">Edit</BaseButton>
            <BaseButton size="sm" variant="danger" @click="confirmRow = row">Delete</BaseButton>
          </div>
        </template>
      </DataTable>

      <div class="border-t border-line p-4">
        <Pagination v-model:page="page" :size="size" :total="total" />
      </div>
    </div>

    <ModalShell :open="showModal" :title="editing ? 'Edit staff profile' : 'Register workshop technician / driver'" width="max-w-2xl" @close="showModal = false">
      <form class="space-y-4" @submit.prevent="save">
        <div class="grid gap-3.5 sm:grid-cols-2">
          <FormField label="HR employee" required>
            <FleetSelect v-model="form.employeeId" :options="opts.employees.value" placeholder="Select HR employee…" :disabled="!!editing" />
          </FormField>
          <FormField label="Bay assignment"><TextInput v-model="form.bayAssignment" placeholder="e.g. Bay 2 — Heavy" /></FormField>
          <FormField label="Trade role" required><FleetSelect v-model="form.tradeRole" :options="TRADE_ROLES" :allow-empty="false" /></FormField>
          <FormField label="Skill level"><FleetSelect v-model="form.skillLevel" :options="SKILL_LEVELS" :allow-empty="false" /></FormField>
          <FormField label="Hourly cost rate"><TextInput v-model="form.hourlyCostRate" type="number" step="any" /></FormField>
          <FormField label="Hourly charge rate"><TextInput v-model="form.hourlyChargeRate" type="number" step="any" /></FormField>
          <FormField label="Rate currency"><FleetSelect v-model="form.currencyId" :options="opts.currencies.value" placeholder="Unit default" /></FormField>
          <label class="flex items-center gap-2 pt-6 text-xs font-medium"><input v-model="form.isActive" type="checkbox" class="h-4 w-4" /> Active</label>
          <FormField label="Notes" class="sm:col-span-2"><TextareaInput v-model="form.notes" :rows="2" /></FormField>
        </div>

        <div class="space-y-2 rounded-xl border border-line bg-canvas/40 p-3.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-ink">Certifications &amp; licenses</span>
            <BaseButton size="sm" variant="secondary" icon="plus" @click="addCert">Add certification</BaseButton>
          </div>
          <div v-if="!certifications.length" class="text-xs text-ink-faint">No certifications listed.</div>
          <div v-for="(_, idx) in certifications" :key="idx" class="flex items-center gap-2">
            <TextInput v-model="certifications[idx]" placeholder="e.g. Heavy Diesel Class A, CAT ET Diagnostics…" class="flex-1" />
            <button type="button" class="text-xs text-rose-600 hover:underline" @click="certifications.splice(idx, 1)">×</button>
          </div>
        </div>

        <p v-if="formError" role="alert" class="text-sm text-rose-600">{{ formError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="saving">Save profile</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ConfirmDialog
      :open="!!confirmRow"
      title="Remove workshop profile?"
      :message="`Remove ${confirmRow?.employeeName} from workshop roster?`"
      confirm-label="Delete"
      tone="danger"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="confirmRow = null"
    />
  </section>
</template>
