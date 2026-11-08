<script setup lang="ts">
useHead({ title: 'Journal Entries' })
const toast = useToast()
const api = useApi()
const { money, date } = useFormat()

const { data: coa } = await useAsyncData('coa-journal', () => $fetch<any>('/api/accounting/accounts'))
const postable = computed(() => (coa.value?.pageItems ?? []).filter((a: any) => a.usage === 'detail' && a.manualEntriesAllowed))

const page = ref(1)
const glAccountId = ref('')
const size = 25
const { data, pending, refresh } = useResource<any>('/accounting/journal', () => ({ page: page.value, size, glAccountId: glAccountId.value }))

const columns = [
  { key: 'entryDate', label: 'Date', sortable: true },
  { key: 'transactionId', label: 'Transaction' },
  { key: 'glCode', label: 'GL' },
  { key: 'glAccountName', label: 'Account' },
  { key: 'debit', label: 'Debit', align: 'right' as const },
  { key: 'credit', label: 'Credit', align: 'right' as const },
  { key: 'userName', label: 'Posted by' },
]

const rows = computed(() => (data.value?.pageItems ?? []).map((j: any) => ({
  ...j,
  debit: j.entryType === 'DEBIT' ? j.amount : null,
  credit: j.entryType === 'CREDIT' ? j.amount : null,
})))

// voucher
const showNew = ref(false)
const busy = ref(false)
const voucher = reactive({ note: '', date: new Date().toISOString().slice(0, 10), lines: [{ glAccountId: '', debit: null }, { glAccountId: '', credit: null }] as { glAccountId: string; debit: number | null; credit: number | null }[] })
function addLine() { voucher.lines.push({ glAccountId: '', debit: null, credit: null }) }
function removeLine(i: number) { if (voucher.lines.length > 2) voucher.lines.splice(i, 1) }
const totals = computed(() => ({
  debit: voucher.lines.reduce((s, l) => s + Number(l.debit || 0), 0),
  credit: voucher.lines.reduce((s, l) => s + Number(l.credit || 0), 0),
}))
const balanced = computed(() => totals.value.debit > 0 && Math.abs(totals.value.debit - totals.value.credit) < 0.01)

async function post() {
  if (!balanced.value) { toast.error('Voucher must balance', 'Debits must equal credits.'); return }
  busy.value = true
  try {
    const res: any = await api.post('/accounting/journal', {
      note: voucher.note, date: voucher.date,
      lines: voucher.lines.filter(l => l.glAccountId).map(l => ({ glAccountId: Number(l.glAccountId), debit: l.debit || 0, credit: l.credit || 0 })),
    })
    toast.success('Voucher posted', res.message)
    showNew.value = false
    await refresh()
  } catch (e: any) { toast.error('Posting failed', e.message) } finally { busy.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="Journal Entries" icon="document-text"
      subtitle="General ledger postings — every financial action in the core lands here as double entry.">
      <BaseButton size="sm" icon="plus" @click="showNew = true">Manual Journal Voucher</BaseButton>
    </PageHeader>

    <BaseCard :pad="false">
      <template #header>
        <div class="px-5 pt-4 flex flex-wrap items-end gap-3">
          <div class="w-72">
            <SelectInput v-model="glAccountId" placeholder="All GL accounts"
              :options="(coa?.pageItems ?? []).filter((a: any) => a.usage === 'detail').map((a: any) => ({ value: a.id, label: `${a.glCode} — ${a.name}` }))" />
          </div>
          <BaseButton v-if="glAccountId" variant="ghost" size="sm" @click="glAccountId = ''">Clear</BaseButton>
        </div>
      </template>
      <DataTable :columns="columns" :rows="rows" :loading="pending" empty="No journal entries.">
        <template #cell="{ col, row }">
          <span v-if="col.key === 'entryDate'" class="text-xs">{{ date(row.entryDate) }}</span>
          <span v-else-if="col.key === 'transactionId'" class="tnum text-xs text-ink-faint">{{ row.transactionId }}</span>
          <span v-else-if="col.key === 'glCode'" class="tnum text-xs font-semibold">{{ row.glCode }}</span>
          <span v-else-if="col.key === 'debit'" class="tnum font-semibold text-ink">{{ row.debit != null ? money(row.debit) : '' }}</span>
          <span v-else-if="col.key === 'credit'" class="tnum font-semibold text-emerald-700">{{ row.credit != null ? money(row.credit) : '' }}</span>
          <span v-else-if="col.key === 'userName'" class="text-xs">{{ row.userName }}</span>
          <span v-else class="text-xs">{{ row[col.key] }}</span>
        </template>
      </DataTable>
      <template #footer>
        <Pagination :page="page" :size="size" :total="data?.totalFilteredCount ?? 0" @update:page="page = $event" />
      </template>
    </BaseCard>

    <ModalShell :open="showNew" title="Manual Journal Voucher" subtitle="Double-entry — debits must equal credits" width="max-w-2xl" @close="showNew = false">
      <div class="space-y-4">
        <FormField label="Narration"><TextInput v-model="voucher.note" placeholder="e.g. Stationery purchase for head office" /></FormField>
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-semibold text-ink-soft">GL lines</p>
            <BaseButton variant="ghost" size="sm" icon="plus" @click="addLine">Add line</BaseButton>
          </div>
          <div class="space-y-2">
            <div v-for="(l, i) in voucher.lines" :key="i" class="grid grid-cols-[1fr_120px_120px_32px] gap-2 items-end">
              <SelectInput v-model="l.glAccountId" placeholder="GL account"
                :options="postable.map((a: any) => ({ value: a.id, label: `${a.glCode} — ${a.name}` }))" />
              <TextInput v-model.number="l.debit" type="number" placeholder="Debit" />
              <TextInput v-model.number="l.credit" type="number" placeholder="Credit" />
              <button class="p-2 text-ink-faint hover:text-red-600" @click="removeLine(i)"><AppIcon name="x-mark" :size="16" /></button>
            </div>
          </div>
        </div>
        <div class="flex justify-between rounded-lg bg-canvas px-4 py-3 text-sm font-semibold tnum">
          <span>Debit: <span class="text-ink">{{ money(totals.debit) }}</span></span>
          <span>Credit: <span class="text-emerald-700">{{ money(totals.credit) }}</span></span>
          <Badge :tone="balanced ? 'green' : 'red'">{{ balanced ? 'Balanced' : 'Out of balance' }}</Badge>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" size="sm" @click="showNew = false">Cancel</BaseButton>
        <BaseButton size="sm" variant="success" :disabled="busy || !balanced" icon="check" @click="post">{{ busy ? 'Posting…' : 'Post voucher' }}</BaseButton>
      </template>
    </ModalShell>
  </div>
</template>
