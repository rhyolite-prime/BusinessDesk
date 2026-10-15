<script setup lang="ts">
useHead({ title: 'Maker-Checker' })
const toast = useToast()
const api = useApi()
const { money, date } = useFormat()
const { meta } = useStatusMeta()

const filter = ref('pending')
const page = ref(1)
const { data, refresh } = useResource<any>('/system/tasks', () => ({ status: filter.value, page: page.value, size: 20 }))
watch(filter, () => { page.value = 1 })

const busy = ref<number | null>(null)
const note = reactive({} as Record<number, string>)

async function decide(task: any, decision: 'approve' | 'reject') {
  busy.value = task.id
  try {
    const res: any = await api.post(`/system/tasks/${task.id}/${decision}`, { note: note[task.id] })
    toast.success(decision === 'approve' ? 'Task approved' : 'Task rejected', res.message)
    delete note[task.id]
    await refresh()
  } catch (e: any) { toast.error('Decision failed', e.message) } finally { busy.value = null }
}

const entityIcon = (t: string) => t === 'LOAN' ? 'credit-card' : t === 'SAVINGS' ? 'wallet' : t === 'CLIENT' ? 'user' : 'document-text'
const entityLink = (t: any) =>
  t.entityType === 'LOAN' ? `/loans/${t.entityId}` :
  t.entityType === 'SAVINGS' ? `/savings/${t.entityId}` :
  t.entityType === 'CLIENT' ? `/clients/${t.entityId}` : ''
</script>

<template>
  <div>
    <PageHeader title="Maker-Checker Queue" icon="shield-check"
      subtitle="The two-person rule (Fineract maker-checker): one user creates, another approves. Approving applies the change for real.">
      <div class="flex rounded-lg border border-line bg-surface p-0.5">
        <button v-for="f in ['pending', 'approved', 'rejected']" :key="f"
          class="px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition"
          :class="filter === f ? 'bg-primary text-on-primary' : 'text-ink-faint hover:text-ink'"
          @click="filter = f">{{ f }}</button>
      </div>
    </PageHeader>

    <div class="space-y-3">
      <BaseCard v-for="t in data?.pageItems ?? []" :key="t.id" :pad="false">
        <div class="p-5 flex flex-wrap items-center gap-4">
          <span class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            :class="t.status === 'pending' ? 'bg-amber-50 text-amber-600' : t.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'">
            <AppIcon :name="entityIcon(t.entityType)" :size="20" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-semibold text-sm text-ink">{{ t.action }}</p>
              <Badge size="sm" tone="gray">{{ t.entityType }}</Badge>
              <Badge size="sm" :tone="meta(t.status).tone" dot>{{ meta(t.status).label }}</Badge>
            </div>
            <p class="text-xs text-ink-faint mt-0.5">
              <NuxtLink v-if="entityLink(t)" :to="entityLink(t)" class="hover:text-primary">{{ t.entityLabel }}</NuxtLink>
              <span v-else>{{ t.entityLabel }}</span>
              <span v-if="t.amount"> · <strong class="tnum">{{ money(t.amount) }}</strong></span>
            </p>
            <p class="text-[11px] text-ink-faint mt-0.5">
              Maker: {{ t.makerName }} · {{ date(t.createdDate) }}
              <span v-if="t.checkerName"> · Checker: {{ t.checkerName }} · {{ date(t.checkedDate) }}</span>
            </p>
            <p v-if="t.note && t.status !== 'pending'" class="text-[11px] mt-1 text-ink-soft italic">“{{ t.note }}”</p>
          </div>
          <div v-if="t.status === 'pending'" class="flex items-center gap-2 w-full sm:w-auto">
            <TextInput v-model="note[t.id]" placeholder="Checker note (optional)" class="flex-1 sm:w-52" />
            <BaseButton size="sm" variant="danger" icon="x-mark" :disabled="busy === t.id" @click="decide(t, 'reject')">Reject</BaseButton>
            <BaseButton size="sm" variant="success" icon="check" :disabled="busy === t.id" @click="decide(t, 'approve')">Approve</BaseButton>
          </div>
        </div>
      </BaseCard>

      <BaseCard v-if="!data?.pageItems?.length">
        <EmptyState icon="check-circle" title="Nothing here"
          :message="filter === 'pending' ? 'No transactions awaiting approval — the queue is clear.' : `No ${filter} tasks.`" />
      </BaseCard>

      <Pagination :page="page" :size="20" :total="data?.totalFilteredCount ?? 0" @update:page="page = $event" />
    </div>
  </div>
</template>
