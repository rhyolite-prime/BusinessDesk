<script setup lang="ts">
import { useDocuments, useDocumentsUnitId } from '../../features/documents/useDocuments'
import type { DmDocument, DmFolder, DmTemplate } from '../../features/documents/document-types'
import FolderTree from '../../features/documents/components/FolderTree.vue'
import DocumentPreviewModal from '../../features/documents/components/DocumentPreviewModal.vue'
import DocumentUploadModal from '../../features/documents/components/DocumentUploadModal.vue'
import CheckinModal from '../../features/documents/components/CheckinModal.vue'
import WorkflowModal from '../../features/documents/components/WorkflowModal.vue'

definePageMeta({ layout: 'admin-dm' })
useHead({ title: 'Document Explorer' })

const api = useDocuments()
const unitId = useDocumentsUnitId()

const folders = ref<DmFolder[]>([])
const templates = ref<DmTemplate[]>([])
const documents = ref<DmDocument[]>([])
const totalDocs = ref(0)
const selectedFolderId = ref<string | null>(null)
const selectedFolder = computed(() => folders.value.find((f) => f.id === selectedFolderId.value))

const loading = ref(false)
const error = ref('')
const searchFilter = ref('')

// Modals
const uploadOpen = ref(false)
const previewOpen = ref(false)
const checkinOpen = ref(false)
const workflowOpen = ref(false)
const activeDoc = ref<DmDocument | null>(null)

// Folder Create/Edit Modal
const folderModalOpen = ref(false)
const folderEditMode = ref(false)
const folderParentId = ref<string | null>(null)
const editingFolderId = ref<string | null>(null)
const folderName = ref('')
const folderDesc = ref('')
const folderLoading = ref(false)
const folderError = ref('')

async function loadFolders() {
  try {
    folders.value = await api.folders()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not load folders.'
  }
}

async function loadDocuments() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.documents({
      folderId: selectedFolderId.value || undefined,
      q: searchFilter.value || undefined,
      size: 50,
    })
    documents.value = res.data
    totalDocs.value = res.totalCount
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not load documents.'
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  await Promise.all([loadFolders(), api.templates().then((t) => (templates.value = t)).catch(() => [])])
  await loadDocuments()
}

watch(unitId, loadAll)
watch(selectedFolderId, () => {
  searchFilter.value = ''
  void loadDocuments()
})
onMounted(loadAll)

function selectFolder(id: string | null) {
  selectedFolderId.value = id
}

function openCreateFolder(parentId: string | null) {
  folderEditMode.value = false
  folderParentId.value = parentId
  folderName.value = ''
  folderDesc.value = ''
  folderError.value = ''
  folderModalOpen.value = true
}

function openEditFolder(folder: DmFolder) {
  folderEditMode.value = true
  editingFolderId.value = folder.id
  folderName.value = folder.name
  folderDesc.value = folder.description || ''
  folderError.value = ''
  folderModalOpen.value = true
}

async function handleDeleteFolder(folder: DmFolder) {
  if (!confirm(`Delete folder "${folder.name}"? It will be moved to the recycle bin.`)) return
  try {
    await api.deleteFolder(folder.id)
    if (selectedFolderId.value === folder.id) selectedFolderId.value = null
    await loadFolders()
    await loadDocuments()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not delete folder.')
  }
}

async function handleFolderSubmit() {
  if (!folderName.value.trim()) {
    folderError.value = 'Folder name is required.'
    return
  }
  folderLoading.value = true
  folderError.value = ''
  try {
    if (folderEditMode.value && editingFolderId.value) {
      await api.updateFolder(editingFolderId.value, {
        name: folderName.value.trim(),
        description: folderDesc.value.trim(),
      })
    } else {
      await api.createFolder({
        name: folderName.value.trim(),
        description: folderDesc.value.trim(),
        parentId: folderParentId.value,
      })
    }
    folderModalOpen.value = false
    await loadFolders()
  } catch (e: any) {
    folderError.value = e?.data?.statusMessage || 'Could not save folder.'
  } finally {
    folderLoading.value = false
  }
}

function openPreview(doc: DmDocument) {
  activeDoc.value = doc
  previewOpen.value = true
}

function openCheckin(doc: DmDocument) {
  activeDoc.value = doc
  checkinOpen.value = true
}

function openWorkflow(doc: DmDocument) {
  activeDoc.value = doc
  workflowOpen.value = true
}

async function handleCheckout(doc: DmDocument) {
  try {
    await api.checkoutDocument(doc.id)
    await loadDocuments()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not check out document.')
  }
}

async function handleToggleBookmark(doc: DmDocument) {
  try {
    const isBookmarked = await api.bookmarkDocument(doc.id)
    doc.isBookmarked = isBookmarked
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not update bookmark.')
  }
}

async function handleToggleLock(doc: DmDocument) {
  try {
    if (doc.isLocked) {
      await api.unlockDocument(doc.id)
    } else {
      await api.lockDocument(doc.id)
    }
    await loadDocuments()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not toggle lock.')
  }
}

async function handleDeleteDoc(doc: DmDocument) {
  if (!confirm(`Move "${doc.title}" to the recycle bin?`)) return
  try {
    await api.deleteDocument(doc.id)
    await loadDocuments()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not delete document.')
  }
}

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
      title="Document Explorer"
      subtitle="Hierarchical folder navigation, file uploads, check-in/check-out, and document preview."
      icon="folder"
    >
      <BaseButton variant="secondary" @click="openCreateFolder(selectedFolderId)">
        <AppIcon name="folder-plus" :size="16" class="mr-1" /> New folder
      </BaseButton>
      <BaseButton variant="primary" @click="uploadOpen = true">
        <AppIcon name="plus" :size="16" class="mr-1" /> Upload document
      </BaseButton>
    </PageHeader>

    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

    <!-- Explorer Grid: Folders on Left, Document Table on Right -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <!-- Folder Tree Sidebar -->
      <div class="lg:col-span-1">
        <FolderTree
          :folders="folders"
          :selected-folder-id="selectedFolderId"
          @select="selectFolder"
          @create="openCreateFolder"
          @edit="openEditFolder"
          @delete="handleDeleteFolder"
        />
      </div>

      <!-- Main Document Pane -->
      <div class="space-y-4 lg:col-span-3">
        <!-- Breadcrumbs & Search Toolbar -->
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 shadow-sm">
          <div class="flex items-center gap-1.5 text-xs text-ink-faint">
            <span class="cursor-pointer hover:text-primary" @click="selectFolder(null)">Root</span>
            <span v-if="selectedFolder">/</span>
            <span v-if="selectedFolder" class="font-bold text-ink">{{ selectedFolder.name }}</span>
            <span class="ml-2 text-[11px]">({{ totalDocs }} documents)</span>
          </div>

          <div class="flex items-center gap-2">
            <input
              v-model="searchFilter"
              type="text"
              placeholder="Filter by title, file or tag..."
              class="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
              @keyup.enter="loadDocuments"
            />
            <BaseButton size="sm" variant="secondary" @click="loadDocuments">
              Filter
            </BaseButton>
          </div>
        </div>

        <!-- Document Table -->
        <div class="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-line bg-canvas/40 text-ink-faint">
              <tr>
                <th class="w-8 px-3 py-2.5 text-center">★</th>
                <th class="px-3 py-2.5">Document #</th>
                <th class="px-3 py-2.5">Title &amp; file</th>
                <th class="px-3 py-2.5">Type</th>
                <th class="px-3 py-2.5">Version</th>
                <th class="px-3 py-2.5">Status</th>
                <th class="px-3 py-2.5">Size</th>
                <th class="px-3 py-2.5">Lock / Checkout</th>
                <th class="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="doc in documents" :key="doc.id" class="hover:bg-canvas/20">
                <td class="px-3 py-2 text-center">
                  <button
                    type="button"
                    class="transition"
                    :class="doc.isBookmarked ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'"
                    title="Bookmark document"
                    @click="handleToggleBookmark(doc)"
                  >
                    ★
                  </button>
                </td>
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
                <td class="px-3 py-2">
                  <span v-if="doc.isCheckedOut" class="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                    <AppIcon name="lock-closed" :size="12" /> Checked out
                  </span>
                  <span v-else-if="doc.isLocked" class="inline-flex items-center gap-1 text-[11px] text-red-700 dark:text-red-300">
                    <AppIcon name="lock-closed" :size="12" /> Locked
                  </span>
                  <span v-else class="text-[11px] text-emerald-600">Available</span>
                </td>
                <td class="px-3 py-2 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      class="rounded p-1 text-ink-faint hover:bg-canvas hover:text-primary"
                      title="Inspect / Preview"
                      @click="openPreview(doc)"
                    >
                      <AppIcon name="eye" :size="14" />
                    </button>
                    <button
                      v-if="doc.canCheckOut"
                      type="button"
                      class="rounded p-1 text-ink-faint hover:bg-canvas hover:text-ink"
                      title="Check out"
                      @click="handleCheckout(doc)"
                    >
                      <AppIcon name="arrow-down-tray" :size="14" />
                    </button>
                    <button
                      v-if="doc.canCheckIn"
                      type="button"
                      class="rounded p-1 text-ink-faint hover:bg-canvas hover:text-emerald-600"
                      title="Check in revision"
                      @click="openCheckin(doc)"
                    >
                      <AppIcon name="arrow-up-tray" :size="14" />
                    </button>
                    <button
                      type="button"
                      class="rounded p-1 text-ink-faint hover:bg-canvas hover:text-amber-600"
                      title="Workflow action"
                      @click="openWorkflow(doc)"
                    >
                      <AppIcon name="document-check" :size="14" />
                    </button>
                    <button
                      type="button"
                      class="rounded p-1 text-ink-faint hover:bg-canvas"
                      :class="doc.isLocked ? 'text-red-600' : 'hover:text-ink'"
                      :title="doc.isLocked ? 'Unlock' : 'Lock'"
                      @click="handleToggleLock(doc)"
                    >
                      <AppIcon :name="doc.isLocked ? 'lock-open' : 'lock-closed'" :size="14" />
                    </button>
                    <button
                      type="button"
                      class="rounded p-1 text-ink-faint hover:bg-canvas hover:text-red-600"
                      title="Delete / Trash"
                      @click="handleDeleteDoc(doc)"
                    >
                      <AppIcon name="trash" :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!documents.length">
                <td colspan="9" class="py-12 text-center text-ink-faint">
                  No documents found in this folder. Click "Upload document" to add one.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <DocumentUploadModal
      :open="uploadOpen"
      :folders="folders"
      :templates="templates"
      :default-folder-id="selectedFolderId"
      @close="uploadOpen = false"
      @created="loadDocuments"
    />

    <DocumentPreviewModal
      :open="previewOpen"
      :document="activeDoc"
      @close="previewOpen = false"
      @updated="loadDocuments"
      @checkout="handleCheckout"
      @checkin="openCheckin"
      @workflow="openWorkflow"
    />

    <CheckinModal
      :open="checkinOpen"
      :document="activeDoc"
      @close="checkinOpen = false"
      @checked-in="loadDocuments"
    />

    <WorkflowModal
      :open="workflowOpen"
      :document="activeDoc"
      @close="workflowOpen = false"
      @updated="loadDocuments"
    />

    <!-- Folder Modal -->
    <ModalShell
      :open="folderModalOpen"
      :title="folderEditMode ? 'Edit folder' : 'Create folder'"
      subtitle="Folder taxonomy and hierarchical storage"
      width="max-w-md"
      @close="folderModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="handleFolderSubmit">
        <div v-if="folderError" class="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {{ folderError }}
        </div>
        <FormField label="Folder name *" required>
          <TextInput v-model="folderName" placeholder="e.g. Invoices 2026" required />
        </FormField>
        <FormField label="Description">
          <TextareaInput v-model="folderDesc" placeholder="Folder description or purpose..." :rows="2" />
        </FormField>
        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="secondary" type="button" @click="folderModalOpen = false">
            Cancel
          </BaseButton>
          <BaseButton variant="primary" type="submit" :disabled="folderLoading">
            {{ folderLoading ? 'Saving...' : folderEditMode ? 'Update folder' : 'Create folder' }}
          </BaseButton>
        </div>
      </form>
    </ModalShell>
  </section>
</template>
