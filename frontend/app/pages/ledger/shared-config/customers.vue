<script setup lang="ts">
import { Plus, RefreshCw, Save, Trash2, Pencil } from '@lucide/vue'
import {
  useVoucherLookups,
  type CustomerVoucherOption,
} from '../../../features/ledger/useVoucherLookups'
definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Customers' })
const request = useRequestFetch()
const {
  unitId,
  units,
  currencies,
  accounts,
  baseCurrency,
  loading,
  error: lookupError,
} = useVoucherLookups()
const rows = ref<CustomerVoucherOption[]>([]),
  page = ref(1),
  totalPages = ref(1),
  error = ref(''),
  busy = ref(false),
  editing = ref<CustomerVoucherOption | null>(null),
  showForm = ref(false)
const form = reactive({
  accountNumber: '',
  name: '',
  accountingUnitId: '',
  receivableAccountId: '',
  currencyId: '',
  isActive: true,
})
const arAccounts = computed(() =>
  accounts.value.filter(
    (a) =>
      !a.currencyId ||
      a.currencyId ===
        currencies.value.find((c) => c.code === baseCurrency.value)?.id,
  ),
)
let generation = 0
async function load() {
  const current = ++generation
  error.value = ''
  rows.value = []
  try {
    const result = await request<{
      data: CustomerVoucherOption[]
      totalPages: number
    }>('/api/shared/customers', {
      query: { pageNo: page.value, pageSize: 100 },
    })
    if (current === generation) {
      rows.value = result.data
      totalPages.value = result.totalPages || 1
    }
  } catch (e: any) {
    if (current === generation)
      error.value = e?.data?.statusMessage || 'Customers could not be loaded.'
  }
}
function create() {
  editing.value = null
  Object.assign(form, {
    accountNumber: '',
    name: '',
    accountingUnitId: unitId.value,
    receivableAccountId: '',
    currencyId:
      currencies.value.find((c) => c.code === baseCurrency.value)?.id || '',
    isActive: true,
  })
  showForm.value = true
}
function edit(row: CustomerVoucherOption) {
  editing.value = row
  unitId.value = row.accountingUnitId
  Object.assign(form, {
    accountNumber: row.accountNumber,
    name: row.name,
    accountingUnitId: row.accountingUnitId,
    receivableAccountId: row.receivableAccountId,
    currencyId: row.currencyId,
    isActive: row.isActive,
  })
  showForm.value = true
}
function changeUnit() {
  form.accountingUnitId = unitId.value
  form.receivableAccountId = ''
}
async function save() {
  busy.value = true
  error.value = ''
  try {
    if (editing.value)
      await request(`/api/shared/customers/${editing.value.id}`, {
        method: 'PUT',
        body: { ...form, version: editing.value.version },
      })
    else
      await request('/api/shared/customers', {
        method: 'POST',
        body: { ...form },
      })
    showForm.value = false
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Unable to save customer.'
  } finally {
    busy.value = false
  }
}
async function remove(row: CustomerVoucherOption) {
  if (!confirm(`Archive customer ${row.accountNumber} — ${row.name}?`)) return
  busy.value = true
  error.value = ''
  try {
    await request(`/api/shared/customers/${row.id}`, {
      method: 'DELETE',
      body: { version: row.version },
    })
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Unable to archive customer.'
  } finally {
    busy.value = false
  }
}
watch(page, load)
onMounted(load)
onUnmounted(() => generation++)
</script>
<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p
          class="text-xs font-semibold uppercase tracking-widest text-brand-700"
        >
          Shared configuration
        </p>
        <h1 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          Customers
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          Customer receivables mappings for receipt vouchers. Tenant
          administrators manage this catalog.
        </p>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold dark:border-slate-700"
          @click="load"
        >
          <RefreshCw :size="14" /> Refresh</button
        ><button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white"
          :disabled="loading"
          @click="create"
        >
          <Plus :size="14" /> Add customer
        </button>
      </div>
    </header>
    <div
      v-if="error || lookupError"
      role="alert"
      class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
    >
      {{ error || lookupError }}
    </div>
    <form
      v-if="showForm"
      class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#15201e]"
      @submit.prevent="save"
    >
      <h2 class="text-sm font-semibold">
        {{ editing ? 'Edit customer' : 'New customer' }}
      </h2>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="text-xs font-medium"
          >Customer number<input
            v-model="form.accountNumber"
            required
            maxlength="80"
            class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
        /></label>
        <label class="text-xs font-medium"
          >Customer name<input
            v-model="form.name"
            required
            maxlength="200"
            class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
        /></label>
        <label class="text-xs font-medium"
          >Accounting unit<select
            v-model="unitId"
            aria-label="Accounting unit"
            required
            class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
            @change="changeUnit"
          >
            <option value="" disabled>Select unit</option>
            <option v-for="u in units" :key="u.id" :value="u.id">
              {{ u.code }} — {{ u.name }}
            </option>
          </select></label
        >
        <label class="text-xs font-medium"
          >Receivable G/L<select
            v-model="form.receivableAccountId"
            aria-label="Receivable G/L"
            required
            :disabled="loading"
            class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
          >
            <option value="" disabled>Select G/L</option>
            <option v-for="a in arAccounts" :key="a.id" :value="a.id">
              {{ a.accountNumber }} — {{ a.accountName }}
            </option>
          </select></label
        >
        <label class="text-xs font-medium"
          >Transaction currency<select
            v-model="form.currencyId"
            aria-label="Transaction currency"
            required
            class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
          >
            <option value="" disabled>Select currency</option>
            <option v-for="c in currencies" :key="c.id" :value="c.id">
              {{ c.code }} — {{ c.name }}
            </option>
          </select></label
        >
        <label class="flex items-center gap-2 text-xs"
          ><input v-model="form.isActive" type="checkbox" /> Active</label
        >
      </div>
      <p class="text-xs text-slate-500">
        The receivable G/L must be manual-postable, non-control and in the
        unit's base currency. A live receipt locks the customer mapping to
        preserve its accounting history.
      </p>
      <div class="flex gap-2">
        <button
          type="submit"
          :disabled="busy || loading"
          class="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Save :size="14" /> Save customer</button
        ><button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-xs dark:border-slate-700"
          @click="showForm = false"
        >
          Cancel
        </button>
      </div>
    </form>
    <section
      class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#15201e]"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead
            class="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-900"
          >
            <tr>
              <th class="p-4">Number</th>
              <th class="p-4">Customer</th>
              <th class="p-4">Currency</th>
              <th class="p-4">Status</th>
              <th class="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="row in rows" :key="row.id">
              <td class="p-4">{{ row.accountNumber }}</td>
              <td class="p-4 font-medium">{{ row.name }}</td>
              <td class="p-4">{{ row.currencyCode }}</td>
              <td class="p-4">{{ row.isActive ? 'Active' : 'Inactive' }}</td>
              <td class="p-4 text-right">
                <button
                  type="button"
                  :aria-label="`Edit ${row.name}`"
                  class="rounded-lg p-2 text-brand-700"
                  :disabled="busy"
                  @click="edit(row)"
                >
                  <Pencil :size="14" /></button
                ><button
                  type="button"
                  :aria-label="`Archive ${row.name}`"
                  class="rounded-lg p-2 text-rose-600"
                  :disabled="busy"
                  @click="remove(row)"
                >
                  <Trash2 :size="14" />
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="5" class="p-8 text-center text-slate-400">
                No customers to display.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer
        class="flex items-center justify-between border-t border-slate-100 p-4 text-xs dark:border-slate-800"
      >
        <button type="button" :disabled="page <= 1" @click="page--">
          Previous</button
        ><span>Page {{ page }} of {{ totalPages }}</span
        ><button type="button" :disabled="page >= totalPages" @click="page++">
          Next
        </button>
      </footer>
    </section>
  </div>
</template>
