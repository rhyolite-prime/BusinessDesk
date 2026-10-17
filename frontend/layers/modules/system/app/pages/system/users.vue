<script setup lang="ts">
useHead({ title: 'Users' })
const toast = useToast()
const api = useApi()
const { date, relative } = useFormat()
const { data: refData } = await useAsyncData('meta-users', () => $fetch<any>('/api/system/meta'))
const { data, refresh } = await useAsyncData('users', () => $fetch<any>('/api/system/users'))

const showNew = ref(false)
const busy = ref(false)
const form = reactive({
  username: '', firstname: '', lastname: '', email: '', officeId: 1,
  roleNames: ['Loan Officer'],
})
const roles = ref<string[]>(['Loan Officer'])
async function create() {
  if (!form.username || !form.firstname || !form.lastname) { toast.error('Username and name required'); return }
  busy.value = true
  try {
    const res: any = await api.post('/system/users', { ...form, roleNames: roles.value })
    toast.success('User created', res.message)
    showNew.value = false
    Object.assign(form, { username: '', firstname: '', lastname: '', email: '' })
    await refresh()
  } catch (e: any) { toast.error('Failed', e.message) } finally { busy.value = false }
}
function toggleRole(r: string) {
  roles.value = roles.value.includes(r) ? roles.value.filter(x => x !== r) : [...roles.value, r]
}
</script>

<template>
  <div>
    <PageHeader title="Users" icon="users" subtitle="Console users with office and role assignments.">
      <BaseButton size="sm" icon="plus" @click="showNew = true">New User</BaseButton>
    </PageHeader>

    <BaseCard :pad="false">
      <DataTable
        :columns="[
          { key: 'display', label: 'User' },
          { key: 'username', label: 'Username' },
          { key: 'roleNames', label: 'Roles' },
          { key: 'officeName', label: 'Office' },
          { key: 'lastLogin', label: 'Last login' },
          { key: 'status', label: 'Status', align: 'center' }]"
        :rows="data?.pageItems ?? []">
        <template #cell="{ col, row }">
          <span v-if="col.key === 'display'" class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-[11px] font-bold">
              {{ row.firstname[0] }}{{ row.lastname[0] }}
            </span>
            <span><span class="font-semibold text-ink block">{{ row.firstname }} {{ row.lastname }}</span><span class="text-[11px] text-ink-faint">{{ row.email }}</span></span>
          </span>
          <span v-else-if="col.key === 'roleNames'">
            <span v-for="r in row.roleNames" :key="r" class="inline-block mr-1 mb-1"><Badge size="sm" tone="blue">{{ r }}</Badge></span>
          </span>
          <span v-else-if="col.key === 'lastLogin'" class="text-xs">{{ relative(row.lastLogin) }}</span>
          <span v-else-if="col.key === 'status'">
            <Badge size="sm" :tone="row.status === 'active' ? 'green' : 'red'" dot>{{ row.status }}</Badge>
          </span>
          <span v-else class="text-xs">{{ row[col.key] }}</span>
        </template>
      </DataTable>
    </BaseCard>

    <ModalShell :open="showNew" title="Create User" @close="showNew = false" width="max-w-xl">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <FormField label="First name" required><TextInput v-model="form.firstname" /></FormField>
          <FormField label="Last name" required><TextInput v-model="form.lastname" /></FormField>
        </div>
        <FormField label="Username" required><TextInput v-model="form.username" placeholder="first.lastname" /></FormField>
        <FormField label="Email"><TextInput v-model="form.email" type="email" /></FormField>
        <FormField label="Office"><SelectInput v-model="form.officeId" :options="refData?.offices ?? []" /></FormField>
        <FormField label="Roles">
          <div class="flex flex-wrap gap-2">
            <button v-for="r in refData?.roles ?? []" :key="r.value" type="button"
              class="px-3 py-1.5 rounded-full text-xs font-medium border transition"
              :class="roles.includes(r.value) ? 'bg-primary text-on-primary border-primary' : 'border-line text-ink-soft hover:border-ink-faint'"
              @click="toggleRole(r.value)">{{ r.label }}</button>
          </div>
        </FormField>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="showNew = false">Cancel</BaseButton>
        <BaseButton size="sm" :disabled="busy" @click="create">{{ busy ? 'Creating…' : 'Create user' }}</BaseButton>
      </template>
    </ModalShell>
  </div>
</template>
