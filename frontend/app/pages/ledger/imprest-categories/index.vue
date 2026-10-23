<script setup lang="ts">
import { Check, Pencil, Plus, Search, Trash2 } from '@lucide/vue'
import {
  useImprestCategories,
  type ImprestCategory,
} from '../../../features/ledger/useImprestCategories'
import { useLedgerSetup } from '../../../features/ledger/setup-data'

definePageMeta({ layout: 'admin-ledger' })

const setup = useLedgerSetup()
const { categories, loading, error, load, unit } = useImprestCategories()
const request = useRequestFetch()
const units = ref<{ id: string; name: string }[]>([])
const busy = ref(false),
  search = ref(''),
  showForm = ref(false)
const editingId = ref<string | null>(null),
  editVersion = ref(0)
const deleteTarget = ref<ImprestCategory | null>(null),
  saveError = ref(''),
  deleteError = ref('')
const form = reactive({ name: '' })
const defaultCategoryId = computed(
  () => setup.defaultGlNumbers.value?.imprestCategoryId || '',
)
const inUseCount = computed(
  () => categories.value.filter((c) => c.id === defaultCategoryId.value).length,
)
const visibleCategories = computed(() =>
  categories.value.filter((c) =>
    c.name.toLowerCase().includes(search.value.trim().toLowerCase()),
  ),
)
const { user } = useBusinessDeskAuth()
const identity = () =>
  `${user.value?.accountId}/${user.value?.username}/${unit.value}`
watch(identity, () => {
  showForm.value = false
  deleteTarget.value = null
  units.value = []
  void loadUnits()
})
let alive = true,
  unitsGeneration = 0
async function loadUnits() {
  const gen = ++unitsGeneration
  try {
    const r = await request<{ id: string; name: string }[]>(
      '/api/ledger/account-head-units',
    )
    if (alive && gen === unitsGeneration) units.value = r
  } catch {
    if (alive && gen === unitsGeneration)
      error.value = 'Unable to load accounting units.'
  }
}
async function retry() {
  error.value = ''
  await loadUnits()
  if (!error.value) await load()
}
onMounted(loadUnits)
onUnmounted(() => {
  alive = false
  unitsGeneration++
})
function openCreate() {
  editingId.value = null
  saveError.value = ''
  form.name = ''
  showForm.value = true
}
async function openEdit(category: ImprestCategory) {
  if (busy.value) return
  const who = identity()
  busy.value = true
  saveError.value = ''
  try {
    const r = await request<ImprestCategory>(
      `/api/ledger/imprest-categories/${category.id}`,
    )
    if (!alive || who !== identity()) return
    editingId.value = r.id
    editVersion.value = r.version
    form.name = r.name
    showForm.value = true
  } catch (e: any) {
    if (alive && who === identity())
      error.value = e?.data?.statusMessage || 'Unable to load category.'
  } finally {
    busy.value = false
  }
}
async function saveCategory() {
  if (busy.value) return
  const who = identity()
  busy.value = true
  saveError.value = ''
  try {
    if (editingId.value)
      await request(`/api/ledger/imprest-categories/${editingId.value}`, {
        method: 'PUT',
        body: { name: form.name, version: editVersion.value },
      })
    else
      await request('/api/ledger/imprest-categories', {
        method: 'POST',
        body: { name: form.name, accountingUnitId: unit.value },
      })
    if (alive && who === identity()) {
      showForm.value = false
      await load()
    }
  } catch (e: any) {
    if (alive && who === identity())
      saveError.value = e?.data?.statusMessage || 'Unable to save category.'
  } finally {
    busy.value = false
  }
}
function openDelete(category: ImprestCategory) {
  if (busy.value) return
  deleteTarget.value = category
  deleteError.value = ''
}
async function removeCategory() {
  if (busy.value || !deleteTarget.value) return
  const who = identity()
  busy.value = true
  deleteError.value = ''
  try {
    await request(`/api/ledger/imprest-categories/${deleteTarget.value.id}`, {
      method: 'DELETE',
      body: { version: deleteTarget.value.version },
    })
    if (alive && who === identity()) {
      deleteTarget.value = null
      await load()
    }
  } catch (e: any) {
    if (alive && who === identity())
      deleteError.value = e?.data?.statusMessage || 'Unable to delete category.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <section
      class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
    >
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">
          General Ledger <span class="mx-1 text-slate-300">/</span> Accountable
          Imprest
        </div>
        <h1
          class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]"
        >
          Imprest Categories
        </h1>
        <p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Create and maintain the categories staff use to classify accountable
          imprests.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800"
        :disabled="!unit || loading || busy"
        @click="openCreate"
      >
        <Plus :size="15" /> Add category
      </button>
    </section>

    <label class="block max-w-sm text-xs font-semibold"
      >Accounting unit
      <select
        aria-label="Accounting unit"
        v-model="unit"
        :disabled="busy"
        class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"
      >
        <option value="">Select accounting unit</option>
        <option v-for="u in units" :key="u.id" :value="u.id">
          {{ u.name }}
        </option>
      </select>
    </label>
    <p v-if="loading" role="status" class="text-xs">Loading categories…</p>
    <p v-if="error" role="alert" class="text-xs text-rose-600">
      {{ error }}
      <button type="button" :disabled="busy" @click="retry">Retry</button>
    </p>

    <section class="grid gap-3 sm:grid-cols-2">
      <article
        class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"
      >
        <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Imprest categories
        </p>
        <p
          class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          {{ categories.length }}
        </p>
      </article>
      <article
        class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"
      >
        <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Assigned as default
        </p>
        <p
          class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          {{ inUseCount }}
        </p>
      </article>
    </section>

    <section
      class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]"
    >
      <div
        class="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800"
      >
        <div>
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white">
            Category directory
          </h2>
          <p class="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {{ visibleCategories.length }} of {{ categories.length }} categories
          </p>
        </div>
        <label class="relative block w-full sm:max-w-[320px]">
          <Search
            :size="15"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            v-model="search"
            type="search"
            placeholder="Search categories…"
            class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30"
          />
        </label>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[620px] text-left">
          <thead
            class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"
          >
            <tr>
              <th class="px-5 py-3">Imprest category</th>
              <th class="px-4 py-3">Default GL mapping</th>
              <th class="w-24 px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="category in visibleCategories"
              :key="category.id"
              class="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
            >
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <span
                    class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-xs font-bold uppercase text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                    >{{ category.name.slice(0, 1) }}</span
                  >
                  <span
                    class="text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >{{ category.name }}</span
                  >
                </div>
              </td>
              <td class="px-4 py-3.5">
                <span
                  v-if="category.id === defaultCategoryId"
                  class="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  >Default category</span
                >
                <span v-else class="text-xs text-slate-400">—</span>
              </td>
              <td class="px-4 py-3.5 text-right">
                <button
                  type="button"
                  class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                  :aria-label="`Edit ${category.name}`"
                  title="Edit category"
                  @click="openEdit(category)"
                >
                  <Pencil :size="14" />
                </button>
                <button
                  type="button"
                  class="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/30"
                  :aria-label="`Delete ${category.name}`"
                  :title="
                    category.id === defaultCategoryId
                      ? 'Change the Default GL Numbers mapping before deleting'
                      : 'Delete category'
                  "
                  :disabled="category.id === defaultCategoryId || busy"
                  @click="openDelete(category)"
                >
                  <Trash2 :size="14" />
                </button>
              </td>
            </tr>
            <tr v-if="!visibleCategories.length">
              <td colspan="3" class="px-5 py-12 text-center">
                <p
                  class="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  No imprest categories found
                </p>
                <p class="mt-1 text-xs text-slate-400">
                  Try another search or add a category.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        class="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:flex-row dark:border-slate-800"
      >
        <span
          >Categories used by default mappings or existing imprests cannot be
          deleted.</span
        >
        <NuxtLink
          to="/ledger/default-gl-numbers"
          class="font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >Review Default GL Numbers →</NuxtLink
        >
      </div>
    </section>

    <SupplierModal
      v-if="showForm"
      :title="editingId ? 'Edit category' : 'New category'"
      :busy="busy"
      @close="showForm = false"
    >
      <div>
        <div class="flex items-start justify-between">
          <div>
            <p class="mt-1 text-xs text-slate-500">
              Use a short, recognizable name for imprest classification.
            </p>
          </div>
        </div>
        <form
          :aria-busy="busy"
          class="mt-5 space-y-4"
          @submit.prevent="saveCategory"
        >
          <label class="block">
            <span
              class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300"
              >Category name</span
            >
            <input
              v-model="form.name"
              :disabled="busy"
              required
              maxlength="160"
              autofocus
              class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30"
              placeholder="e.g. Travel advance"
            />
          </label>
          <p
            v-if="saveError"
            role="alert"
            class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
          >
            {{ saveError }}
          </p>
          <div
            class="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"
          >
            <button
              type="button"
              class="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              @click="!busy && (showForm = false)"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="busy"
              class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800"
            >
              <Check :size="14" />{{
                editingId ? 'Save changes' : 'Create category'
              }}
            </button>
          </div>
        </form>
      </div>
    </SupplierModal>

    <SupplierModal
      v-if="deleteTarget"
      title="Delete this category?"
      :busy="busy"
      @close="deleteTarget = null"
    >
      <div>
        <p class="mt-2 text-sm text-slate-500">
          “{{ deleteTarget.name }}” will be archived in the current accounting
          unit.
        </p>
        <p
          v-if="deleteError"
          role="alert"
          class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {{ deleteError }}
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            @click="!busy && (deleteTarget = null)"
          >
            Cancel
          </button>
          <button
            type="button"
            class="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700"
            @click="removeCategory"
          >
            Delete category
          </button>
        </div>
      </div>
    </SupplierModal>
  </div>
</template>
