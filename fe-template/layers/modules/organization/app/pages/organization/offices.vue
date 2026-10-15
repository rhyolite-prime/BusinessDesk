<script setup lang="ts">
useHead({ title: 'Offices' })
const toast = useToast()
const api = useApi()
const { money, date } = useFormat()
const { data, refresh } = await useAsyncData('offices', () => $fetch<any>('/api/organization/offices'))

const showNew = ref(false)
const busy = ref(false)
const form = reactive({ name: '', parentId: 1, openingDate: new Date().toISOString().slice(0, 10) })
async function create() {
  if (!form.name) { toast.error('Office name required'); return }
  busy.value = true
  try {
    const res: any = await api.post('/organization/offices', form)
    toast.success('Office created', res.message)
    showNew.value = false; form.name = ''
    await refresh()
  } catch (e: any) { toast.error('Failed', e.message) } finally { busy.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="Offices" icon="building-office" subtitle="Branch network and hierarchy.">
      <BaseButton size="sm" icon="plus" @click="showNew = true">New Office</BaseButton>
    </PageHeader>

    <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      <BaseCard v-for="o in data?.pageItems ?? []" :key="o.id">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <AppIcon name="building-office" :size="19" />
            </span>
            <div class="min-w-0">
              <h3 class="font-semibold text-sm text-ink truncate">{{ o.name }}</h3>
              <p class="text-[11px] text-ink-faint">{{ o.externalId }} · opened {{ date(o.openingDate) }}</p>
            </div>
          </div>
          <Badge size="sm" :tone="o.status === 'active' ? 'green' : 'gray'" dot>{{ o.status }}</Badge>
        </div>
        <dl class="grid grid-cols-2 gap-2 mt-4 text-xs">
          <div class="rounded-lg bg-canvas p-2.5"><p class="text-ink-faint">Clients</p><p class="font-bold tnum">{{ o.clients }}</p></div>
          <div class="rounded-lg bg-canvas p-2.5"><p class="text-ink-faint">Staff</p><p class="font-bold tnum">{{ o.staff }}</p></div>
          <div class="rounded-lg bg-canvas p-2.5"><p class="text-ink-faint">Portfolio</p><p class="font-bold tnum">{{ money(o.portfolio) }}</p></div>
          <div class="rounded-lg bg-canvas p-2.5"><p class="text-ink-faint">Deposits</p><p class="font-bold tnum">{{ money(o.deposits) }}</p></div>
        </dl>
        <p class="text-[11px] text-ink-faint mt-3">Reports to: {{ o.parentName }}</p>
      </BaseCard>
    </div>

    <ModalShell :open="showNew" title="Open New Office" @close="showNew = false">
      <div class="space-y-4">
        <FormField label="Office name" required><TextInput v-model="form.name" placeholder="e.g. Ho Branch" /></FormField>
        <FormField label="Parent office">
          <SelectInput v-model="form.parentId" :options="(data?.pageItems ?? []).map((o: any) => ({ value: o.id, label: o.name }))" />
        </FormField>
        <FormField label="Opening date"><TextInput v-model="form.openingDate" type="date" /></FormField>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="showNew = false">Cancel</BaseButton>
        <BaseButton size="sm" :disabled="busy" @click="create">{{ busy ? 'Creating…' : 'Create office' }}</BaseButton>
      </template>
    </ModalShell>
  </div>
</template>
