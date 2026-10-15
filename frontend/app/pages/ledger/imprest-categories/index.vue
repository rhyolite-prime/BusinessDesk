<script setup lang="ts">
import { Check, Pencil, Plus, Search, Trash2, X } from '@lucide/vue'
import type { LedgerImprestCategory } from '../../../features/ledger/setup-data'
import { useLedgerSetup } from '../../../features/ledger/setup-data'

definePageMeta({ layout: 'admin-ledger' })

const setup = useLedgerSetup()
const search = ref('')
const showForm = ref(false)
const editingId = ref<string | null>(null)
const deleteTarget = ref<LedgerImprestCategory | null>(null)
const saveError = ref('')
const deleteError = ref('')
const form = reactive({ name: '' })

const defaultCategoryId = computed(() => setup.defaultGlNumbers.value?.imprestCategoryId || '')
const inUseCount = computed(() => setup.imprestCategories.value.filter((category) => category.id === defaultCategoryId.value).length)
const visibleCategories = computed(() => {
  const term = search.value.trim().toLowerCase()
  return [...setup.imprestCategories.value]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((category) => !term || category.name.toLowerCase().includes(term))
})

function openCreate() {
  editingId.value = null
  saveError.value = ''
  Object.assign(form, { name: '' })
  showForm.value = true
}

function openEdit(category: LedgerImprestCategory) {
  editingId.value = category.id
  saveError.value = ''
  Object.assign(form, { name: category.name })
  showForm.value = true
}

function saveCategory() {
  saveError.value = ''
  const name = form.name.trim()
  if (!name) {
    saveError.value = 'Enter an imprest category name.'
    return
  }
  if (setup.imprestCategories.value.some((category) => category.id !== editingId.value && category.name.toLowerCase() === name.toLowerCase())) {
    saveError.value = 'An imprest category with this name already exists.'
    return
  }
  setup.saveImprestCategory({ id: editingId.value || undefined, name })
  showForm.value = false
}

function removeCategory() {
  const target = deleteTarget.value
  if (!target) return
  deleteError.value = ''
  if (!setup.removeImprestCategory(target.id)) {
    deleteError.value = 'This category is assigned in Default GL Numbers. Change that mapping before deleting it.'
    return
  }
  deleteTarget.value = null
}
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Accountable Imprest</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Imprest Categories</h1>
        <p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Create and maintain the categories staff use to classify accountable imprests.</p>
      </div>
      <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800" @click="openCreate"><Plus :size="15" /> Add category</button>
    </section>

    <div class="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-3 text-xs text-brand-900 dark:border-brand-900/60 dark:bg-brand-950/30 dark:text-brand-200">
      <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold dark:bg-brand-900/60">i</span>
      <p><span class="font-semibold">Preview mode:</span> category changes are held in local workspace demo data until the setup API is connected.</p>
    </div>

    <section class="grid gap-3 sm:grid-cols-2">
      <article class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Imprest categories</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ setup.imprestCategories.value.length }}</p>
      </article>
      <article class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Assigned as default</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ inUseCount }}</p>
      </article>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800">
        <div>
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Category directory</h2>
          <p class="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{{ visibleCategories.length }} of {{ setup.imprestCategories.value.length }} categories</p>
        </div>
        <label class="relative block w-full sm:max-w-[320px]">
          <Search :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="search" type="search" placeholder="Search categories…" class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" />
        </label>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[620px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50">
            <tr><th class="px-5 py-3">Imprest category</th><th class="px-4 py-3">Default GL mapping</th><th class="w-24 px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="category in visibleCategories" :key="category.id" class="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-xs font-bold uppercase text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">{{ category.name.slice(0, 1) }}</span>
                  <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">{{ category.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3.5">
                <span v-if="category.id === defaultCategoryId" class="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">Default category</span>
                <span v-else class="text-xs text-slate-400">—</span>
              </td>
              <td class="px-4 py-3.5 text-right">
                <button type="button" class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" :aria-label="`Edit ${category.name}`" title="Edit category" @click="openEdit(category)"><Pencil :size="14" /></button>
                <button type="button" class="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/30" :aria-label="`Delete ${category.name}`" :title="category.id === defaultCategoryId ? 'Change the Default GL Numbers mapping before deleting' : 'Delete category'" :disabled="category.id === defaultCategoryId" @click="deleteTarget = category; deleteError = ''"><Trash2 :size="14" /></button>
              </td>
            </tr>
            <tr v-if="!visibleCategories.length">
              <td colspan="3" class="px-5 py-12 text-center">
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No imprest categories found</p>
                <p class="mt-1 text-xs text-slate-400">Try another search or add a category.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:flex-row dark:border-slate-800">
        <span>Deleting a category used by a default posting rule is blocked.</span>
        <NuxtLink to="/ledger/default-gl-numbers" class="font-semibold text-brand-700 hover:underline dark:text-brand-300">Review Default GL Numbers →</NuxtLink>
      </div>
    </section>

    <div v-if="showForm" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" role="presentation" @click.self="showForm = false">
      <section role="dialog" aria-modal="true" aria-labelledby="imprest-category-form-title" class="w-full max-w-[500px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <div class="flex items-start justify-between">
          <div><h2 id="imprest-category-form-title" class="text-lg font-semibold text-slate-900 dark:text-white">{{ editingId ? 'Edit category' : 'New category' }}</h2><p class="mt-1 text-xs text-slate-500">Use a short, recognizable name for imprest classification.</p></div>
          <button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close dialog" @click="showForm = false"><X :size="17" /></button>
        </div>
        <form class="mt-5 space-y-4" @submit.prevent="saveCategory">
          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Category name</span>
            <input v-model="form.name" required maxlength="160" autofocus class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" placeholder="e.g. Travel advance" />
          </label>
          <p v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ saveError }}</p>
          <div class="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" class="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="showForm = false">Cancel</button>
            <button type="submit" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800"><Check :size="14" />{{ editingId ? 'Save changes' : 'Create category' }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="deleteTarget" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" role="presentation" @click.self="deleteTarget = null">
      <section role="dialog" aria-modal="true" aria-labelledby="imprest-category-delete-title" class="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <h2 id="imprest-category-delete-title" class="text-base font-semibold text-slate-900 dark:text-white">Delete this category?</h2>
        <p class="mt-2 text-sm text-slate-500">“{{ deleteTarget.name }}” will be removed from the local setup data.</p>
        <p v-if="deleteError" class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ deleteError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300" @click="deleteTarget = null">Cancel</button>
          <button type="button" class="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700" @click="removeCategory">Delete category</button>
        </div>
      </section>
    </div>
  </div>
</template>
