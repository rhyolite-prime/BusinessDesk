<script setup lang="ts">
useHead({ title: 'Staff' })
const toast = useToast()
const api = useApi()
const { money, date: _d } = useFormat()
void _d
const { data: refData } = await useAsyncData('meta-staff', () => $fetch<any>('/api/system/meta'))
const q = ref('')
const page = ref(1)
const { data, refresh } = useResource<any>('/organization/staff', () => ({ q: q.value, page: page.value, size: 20 }))

const showNew = ref(false)
const busy = ref(false)
const form = reactive({ firstname: '', lastname: '', officeId: 1, position: 'Loan Officer', mobile: '', isLoanOfficer: true })
async function create() {
  if (!form.firstname || !form.lastname) { toast.error('Name required'); return }
  busy.value = true
  try {
    const res: any = await api.post('/organization/staff', form)
    toast.success('Staff added', res.message)
    showNew.value = false; form.firstname = ''; form.lastname = ''
    await refresh()
  } catch (e: any) { toast.error('Failed', e.message) } finally { busy.value = false }
}

const columns = [
  { key: 'displayName', label: 'Employee' },
  { key: 'position', label: 'Position' },
  { key: 'officeName', label: 'Office' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'clients', label: 'Clients', align: 'center' as const },
  { key: 'activeLoans', label: 'Active loans', align: 'center' as const },
  { key: 'portfolio', label: 'Portfolio', align: 'right' as const },
  { key: 'status', label: 'Status', align: 'center' as const },
]
</script>

<template>
  <div>
    <PageHeader title="Staff & Employees" icon="identification" subtitle="Loan officers, tellers, managers and support staff.">
      <BaseButton size="sm" icon="plus" @click="showNew = true">Add Staff</BaseButton>
    </PageHeader>

    <BaseCard :pad="false">
      <template #header>
        <div class="px-5 pt-4 relative max-w-sm">
          <span class="absolute left-8 top-1/2 -translate-y-1/2 text-ink-faint"><AppIcon name="magnifying-glass" :size="16" /></span>
          <input v-model="q" placeholder="Search staff…"
            class="w-full pl-9 pr-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </template>
      <DataTable :columns="columns" :rows="data?.pageItems ?? []">
        <template #cell="{ col, row }">
          <span v-if="col.key === 'displayName'" class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center text-[11px] font-bold">
              {{ row.displayName.split(' ').map((w: string) => w[0]).join('') }}
            </span>
            <span>
              <span class="font-semibold text-ink block">{{ row.displayName }}</span>
              <span v-if="row.isLoanOfficer" class="text-[10px] text-primary font-medium">LOAN OFFICER</span>
            </span>
          </span>
          <span v-else-if="col.key === 'portfolio'" class="tnum font-semibold">{{ money(row.portfolio) }}</span>
          <span v-else-if="col.key === 'status'"><Badge size="sm" :tone="row.status === 'active' ? 'green' : 'gray'" dot>{{ row.status }}</Badge></span>
          <span v-else class="text-xs">{{ row[col.key] }}</span>
        </template>
      </DataTable>
      <template #footer>
        <Pagination :page="page" :size="20" :total="data?.totalFilteredCount ?? 0" @update:page="page = $event" />
      </template>
    </BaseCard>

    <ModalShell :open="showNew" title="Add Staff Member" @close="showNew = false">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <FormField label="First name" required><TextInput v-model="form.firstname" /></FormField>
          <FormField label="Last name" required><TextInput v-model="form.lastname" /></FormField>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <FormField label="Office"><SelectInput v-model="form.officeId" :options="refData?.offices ?? []" /></FormField>
          <FormField label="Position"><TextInput v-model="form.position" /></FormField>
        </div>
        <FormField label="Mobile"><TextInput v-model="form.mobile" placeholder="+233 …" /></FormField>
        <label class="flex items-center gap-3 text-sm text-ink-soft cursor-pointer">
          <input v-model="form.isLoanOfficer" type="checkbox" class="w-4 h-4 rounded border-line accent-[var(--brand-primary)]" />
          Loan officer (can be assigned clients & originate loans)
        </label>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="showNew = false">Cancel</BaseButton>
        <BaseButton size="sm" :disabled="busy" @click="create">{{ busy ? 'Adding…' : 'Add staff' }}</BaseButton>
      </template>
    </ModalShell>
  </div>
</template>
