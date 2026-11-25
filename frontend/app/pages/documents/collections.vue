<script setup lang="ts">
import { useDocuments, useDocumentsUnitId } from '../../features/documents/useDocuments'
import type { DmCollection } from '../../features/documents/document-types'

definePageMeta({ layout: 'admin-dm' })
useHead({ title: 'Document Collections' })

const api = useDocuments()
const unitId = useDocumentsUnitId()

const collections = ref<DmCollection[]>([])
const loading = ref(false)
const error = ref('')
const createModalOpen = ref(false)

const form = reactive({
  name: '',
  description: '',
  color: 'indigo',
  icon: 'rectangle-stack',
  isPublic: false,
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    collections.value = await api.collections()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not load collections.'
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!form.name.trim()) return
  try {
    await api.createCollection({
      name: form.name.trim(),
      description: form.description.trim(),
      color: form.color,
      icon: form.icon,
      isPublic: form.isPublic,
    })
    createModalOpen.value = false
    form.name = ''
    form.description = ''
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not create collection.')
  }
}

async function handleDelete(col: DmCollection) {
  if (!confirm(`Are you sure you want to delete collection "${col.name}"?`)) return
  try {
    await api.deleteCollection(col.id)
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not delete collection.')
  }
}

watch(unitId, load)
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Document Collections</h1>
        <p class="text-sm text-ink-soft">
          Virtual cross-unit collections grouping related documents across projects, executive reviews, and governance boards.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
        @click="createModalOpen = true"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        New collection
      </button>
    </div>

    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
      {{ error }}
    </div>

    <div v-if="loading" class="py-12 text-center text-ink-soft">
      Loading collections...
    </div>

    <div v-else-if="!collections.length" class="rounded-2xl border border-dashed border-line p-12 text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
      </div>
      <h3 class="mt-3 text-base font-semibold text-ink">No collections yet</h3>
      <p class="mt-1 text-sm text-ink-soft">Create your first document collection to organize files across folders.</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="col in collections"
        :key="col.id"
        class="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-primary/40 hover:shadow"
      >
        <div>
          <div class="flex items-center justify-between">
            <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </span>
            <span v-if="col.isPublic" class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              Public
            </span>
          </div>
          <h3 class="mt-3 text-base font-bold text-ink">{{ col.name }}</h3>
          <p class="mt-1 line-clamp-2 text-xs text-ink-soft">{{ col.description || 'No description provided.' }}</p>
        </div>

        <div class="mt-5 flex items-center justify-between border-t border-line/60 pt-3 text-xs text-ink-soft">
          <span>{{ col.documentCount || 0 }} documents</span>
          <div class="flex gap-2">
            <button
              type="button"
              class="text-red-600 hover:underline"
              @click="handleDelete(col)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="createModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
        <h3 class="text-lg font-bold text-ink">New Collection</h3>
        <p class="text-xs text-ink-soft">Create a new virtual grouping for documents.</p>

        <form class="mt-4 space-y-4" @submit.prevent="handleCreate">
          <div>
            <label class="block text-xs font-semibold text-ink">Collection name</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
              placeholder="e.g. Q4 Audit Committee"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-ink">Description</label>
            <textarea
              v-model="form.description"
              rows="3"
              class="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
              placeholder="Collection scope and objectives"
            />
          </div>
          <div class="flex items-center gap-2">
            <input
              id="col-public"
              v-model="form.isPublic"
              type="checkbox"
              class="rounded border-line"
            />
            <label for="col-public" class="text-xs font-medium text-ink">Public collection (visible across tenant units)</label>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-slate-50 dark:hover:bg-slate-800"
              @click="createModalOpen = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90"
            >
              Save collection
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
