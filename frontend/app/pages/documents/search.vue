<script setup lang="ts">
import { useDocuments, useDocumentsUnitId } from '../../features/documents/useDocuments'
import type { DmDocument, DmFolder, DmTemplate, DmSavedSearch } from '../../features/documents/document-types'
import DocumentPreviewModal from '../../features/documents/components/DocumentPreviewModal.vue'

definePageMeta({ layout: 'admin-dm' })
useHead({ title: 'Advanced Search' })

const api = useDocuments()
const unitId = useDocumentsUnitId()

const folders = ref<DmFolder[]>([])
const templates = ref<DmTemplate[]>([])
const savedSearches = ref<DmSavedSearch[]>([])
const results = ref<DmDocument[]>([])
const totalCount = ref(0)
const loading = ref(false)
const error = ref('')

// Query filters
const query = ref('')
const selectedFolderId = ref('')
const selectedTemplateId = ref('')
const selectedStatus = ref('')
const tagFilter = ref('')
const bookmarkedOnly = ref(false)
const checkedOutOnly = ref(false)

// Save Search Modal
const saveModalOpen = ref(false)
const saveName = ref('')
const saveDesc = ref('')
const saveLoading = ref(false)
const saveError = ref('')

// Preview modal
const previewOpen = ref(false)
const activeDoc = ref<DmDocument | null>(null)

async function loadLookups() {
  try {
    const [fList, tList, sList] = await Promise.all([
      api.folders().catch(() => []),
      api.templates().catch(() => []),
      api.savedSearches().catch(() => []),
    ])
    folders.value = fList
    templates.value = tList
    savedSearches.value = sList
  } catch (e) {
    // Ignore
  }
}

async function executeSearch() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.documents({
      q: query.value.trim() || undefined,
      folderId: selectedFolderId.value || undefined,
      templateId: selectedTemplateId.value || undefined,
      status: selectedStatus.value || undefined,
      tag: tagFilter.value.trim() || undefined,
      bookmarkedByMe: bookmarkedOnly.value || undefined,
      checkedOutByMe: checkedOutOnly.value || undefined,
      size: 50,
    })
    results.value = res.data
    totalCount.value = res.totalCount
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Search query failed.'
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  query.value = ''
  selectedFolderId.value = ''
  selectedTemplateId.value = ''
  selectedStatus.value = ''
  tagFilter.value = ''
  bookmarkedOnly.value = false
  checkedOutOnly.value = false
  void executeSearch()
}

function applySavedSearch(s: DmSavedSearch) {
  const c = s.criteria || {}
  query.value = c.q || ''
  selectedFolderId.value = c.folderId || ''
  selectedTemplateId.value = c.templateId || ''
  selectedStatus.value = c.status || ''
  tagFilter.value = c.tag || ''
  bookmarkedOnly.value = !!c.bookmarkedByMe
  checkedOutOnly.value = !!c.checkedOutByMe
  void executeSearch()
}

async function handleSaveSearch() {
  if (!saveName.value.trim()) {
    saveError.value = 'Search name is required.'
    return
  }
  saveLoading.value = true
  saveError.value = ''
  try {
    await api.createSavedSearch({
      name: saveName.value.trim(),
      description: saveDesc.value.trim(),
      criteria: {
        q: query.value.trim() || undefined,
        folderId: selectedFolderId.value || undefined,
        templateId: selectedTemplateId.value || undefined,
        status: selectedStatus.value || undefined,
        tag: tagFilter.value.trim() || undefined,
        bookmarkedByMe: bookmarkedOnly.value || undefined,
        checkedOutByMe: checkedOutOnly.value || undefined,
      },
    })
    saveModalOpen.value = false
    savedSearches.value = await api.savedSearches()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Could not save search.'
  } finally {
    saveLoading.value = false
  }
}

async function handleDeleteSavedSearch(id: string) {
  if (!confirm('Delete this saved search?')) return
  await api.deleteSavedSearch(id)
  savedSearches.value = await api.savedSearches()
}

function openPreview(doc: DmDocument) {
  activeDoc.value = doc
  previewOpen.value = true
}

onMounted(async () => {
  await loadLookups()
  await executeSearch()
})
watch(unitId, async () => {
  await loadLookups()
  await executeSearch()
})

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader
      title="Advanced & Parametric Search"
      subtitle="Full-text and metadata retrieval across titles, descriptions, custom attributes, tags and file contents."
      icon="magnifying-glass"
    >
      <BaseButton variant="secondary" @click="saveModalOpen = true">
        <AppIcon name="bookmark" :size="16" class="mr-1" /> Save current search
      </BaseButton>
    </PageHeader>

    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

    <!-- Saved Searches Bar -->
    <div v-if="savedSearches.length" class="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3 text-xs shadow-sm">
      <span class="font-bold text-ink-faint">Saved searches:</span>
      <div v-for="s in savedSearches" :key="s.id" class="inline-flex items-center gap-1 rounded-lg border border-line bg-canvas px-2.5 py-1">
        <button type="button" class="font-semibold text-primary hover:underline" @click="applySavedSearch(s)">
          {{ s.name }}
        </button>
        <button type="button" class="ml-1 text-ink-faint hover:text-red-600" title="Delete" @click="handleDeleteSavedSearch(s.id)">
          ×
        </button>
      </div>
    </div>

    <!-- Parametric Filters Panel -->
    <div class="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-4">
      <!-- Full-text search bar -->
      <div class="flex gap-2">
        <input
          v-model="query"
          type="text"
          placeholder="Search keywords, phrases, title, document # or content text..."
          class="flex-1 rounded-lg border border-line bg-canvas px-4 py-2 text-sm text-ink focus:border-primary focus:outline-none"
          @keyup.enter="executeSearch"
        />
        <BaseButton variant="primary" @click="executeSearch">
          <AppIcon name="magnifying-glass" :size="16" class="mr-1" /> Search
        </BaseButton>
        <BaseButton variant="secondary" @click="resetFilters">
          Reset
        </BaseButton>
      </div>

      <!-- Parametric Filters -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
        <div>
          <label class="block font-semibold text-ink-soft mb-1">Folder</label>
          <select v-model="selectedFolderId" class="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink">
            <option value="">All folders</option>
            <option v-for="f in folders" :key="f.id" :value="f.id">
              {{ f.path }}{{ f.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block font-semibold text-ink-soft mb-1">Template / Type</label>
          <select v-model="selectedTemplateId" class="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink">
            <option value="">All types</option>
            <option v-for="t in templates" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block font-semibold text-ink-soft mb-1">Status</label>
          <select v-model="selectedStatus" class="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="under_review">Under review</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label class="block font-semibold text-ink-soft mb-1">Tag</label>
          <input
            v-model="tagFilter"
            type="text"
            placeholder="e.g. tax, contract..."
            class="w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink"
            @keyup.enter="executeSearch"
          />
        </div>
      </div>

      <!-- Quick Toggles -->
      <div class="flex flex-wrap items-center gap-4 border-t border-line/60 pt-3 text-xs">
        <label class="flex items-center gap-1.5 font-medium text-ink cursor-pointer">
          <input v-model="bookmarkedOnly" type="checkbox" class="h-4 w-4 rounded border-line text-primary focus:ring-primary" @change="executeSearch" />
          Bookmarked by me only
        </label>
        <label class="flex items-center gap-1.5 font-medium text-ink cursor-pointer">
          <input v-model="checkedOutOnly" type="checkbox" class="h-4 w-4 rounded border-line text-primary focus:ring-primary" @change="executeSearch" />
          Checked out by me only
        </label>
      </div>
    </div>

    <!-- Search Results Header -->
    <div class="flex items-center justify-between text-xs text-ink-faint">
      <span>Found <strong class="text-ink">{{ totalCount }}</strong> matching document records</span>
    </div>

    <!-- Results Table -->
    <div class="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
      <table class="w-full text-left text-xs">
        <thead class="border-b border-line bg-canvas/40 text-ink-faint">
          <tr>
            <th class="px-3 py-2.5">Document #</th>
            <th class="px-3 py-2.5">Title &amp; file</th>
            <th class="px-3 py-2.5">Folder</th>
            <th class="px-3 py-2.5">Type</th>
            <th class="px-3 py-2.5">Version</th>
            <th class="px-3 py-2.5">Status</th>
            <th class="px-3 py-2.5">Size</th>
            <th class="px-3 py-2.5 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="doc in results" :key="doc.id" class="hover:bg-canvas/20">
            <td class="px-3 py-2 font-mono font-bold text-primary">
              <button type="button" class="hover:underline" @click="openPreview(doc)">
                {{ doc.documentNumber }}
              </button>
            </td>
            <td class="px-3 py-2">
              <p class="font-semibold text-ink">{{ doc.title }}</p>
              <p class="text-[11px] text-ink-faint">{{ doc.fileName }}</p>
            </td>
            <td class="px-3 py-2 text-ink-soft">
              {{ doc.folderName || 'Root' }}
            </td>
            <td class="px-3 py-2 text-ink-soft">
              {{ doc.templateName || 'General' }}
            </td>
            <td class="px-3 py-2">
              <span class="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                v{{ doc.versionLabel }}
              </span>
            </td>
            <td class="px-3 py-2">
              <Badge :variant="doc.status === 'published' ? 'success' : doc.status === 'under_review' ? 'warning' : 'neutral'">
                {{ doc.status.replace('_', ' ') }}
              </Badge>
            </td>
            <td class="px-3 py-2 text-ink-faint">
              {{ formatBytes(doc.fileSize) }}
            </td>
            <td class="px-3 py-2 text-right">
              <BaseButton size="sm" variant="secondary" @click="openPreview(doc)">
                Inspect
              </BaseButton>
            </td>
          </tr>
          <tr v-if="!results.length">
            <td colspan="8" class="py-12 text-center text-ink-faint">
              No documents match the current search criteria.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Preview Modal -->
    <DocumentPreviewModal
      :open="previewOpen"
      :document="activeDoc"
      @close="previewOpen = false"
      @updated="executeSearch"
    />

    <!-- Save Search Modal -->
    <ModalShell
      :open="saveModalOpen"
      title="Save search query"
      subtitle="Save your current criteria for fast retrieval"
      width="max-w-md"
      @close="saveModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="handleSaveSearch">
        <div v-if="saveError" class="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {{ saveError }}
        </div>
        <FormField label="Search name *" required>
          <TextInput v-model="saveName" placeholder="e.g. Open Contracts 2026" required />
        </FormField>
        <FormField label="Description">
          <TextareaInput v-model="saveDesc" placeholder="Query description..." :rows="2" />
        </FormField>
        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="secondary" type="button" @click="saveModalOpen = false">
            Cancel
          </BaseButton>
          <BaseButton variant="primary" type="submit" :disabled="saveLoading">
            {{ saveLoading ? 'Saving...' : 'Save search' }}
          </BaseButton>
        </div>
      </form>
    </ModalShell>
  </section>
</template>
