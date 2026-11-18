<script setup lang="ts">
import { useDocuments, useDocumentsUnitId } from '../../features/documents/useDocuments'
import type { DmTrashItem } from '../../features/documents/document-types'

definePageMeta({ layout: 'admin-dm' })
useHead({ title: 'Recycle Bin' })

const api = useDocuments()
const unitId = useDocumentsUnitId()

const deletedDocs = ref<DmTrashItem[]>([])
const deletedFolders = ref<DmTrashItem[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.trash()
    deletedDocs.value = res.documents
    deletedFolders.value = res.folders
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not load recycle bin.'
  } finally {
    loading.value = false
  }
}

watch(unitId, load)
onMounted(load)

async function handleRestore(item: DmTrashItem) {
  try {
    await api.restoreTrash(item.id, item.type)
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not restore item.')
  }
}

async function handlePurge(item: DmTrashItem) {
  if (!confirm(`Permanently purge "${item.title}"? This cannot be undone.`)) return
  try {
    await api.purgeTrash(item.id)
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not purge item.')
  }
}

function formatBytes(bytes?: number) {
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
      title="Recycle Bin (Trash)"
      subtitle="Safely recover accidentally deleted records or permanently purge items."
      icon="trash"
    />

    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

    <!-- Deleted Folders Section -->
    <div class="space-y-3">
      <h2 class="text-xs font-bold uppercase tracking-wider text-ink-faint">
        Deleted folders ({{ deletedFolders.length }})
      </h2>
      <div class="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
        <table class="w-full text-left text-xs">
          <thead class="border-b border-line bg-canvas/40 text-ink-faint">
            <tr>
              <th class="px-3 py-2.5">Folder name</th>
              <th class="px-3 py-2.5">Path</th>
              <th class="px-3 py-2.5">Deleted date</th>
              <th class="px-3 py-2.5">Deleted by</th>
              <th class="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="f in deletedFolders" :key="f.id" class="hover:bg-canvas/20">
              <td class="px-3 py-2 font-bold text-ink">
                {{ f.title }}
              </td>
              <td class="px-3 py-2 text-ink-faint">
                {{ f.path }}
              </td>
              <td class="px-3 py-2 text-ink-faint">
                {{ f.deletedAt ? new Date(f.deletedAt).toLocaleDateString() : '—' }}
              </td>
              <td class="px-3 py-2 text-ink-faint">
                {{ f.deletedBy || 'System' }}
              </td>
              <td class="px-3 py-2 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="font-semibold text-primary hover:underline"
                    @click="handleRestore(f)"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    class="font-semibold text-red-600 hover:underline"
                    @click="handlePurge(f)"
                  >
                    Purge
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!deletedFolders.length">
              <td colspan="5" class="py-8 text-center text-ink-faint">
                No deleted folders in recycle bin.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Deleted Documents Section -->
    <div class="space-y-3">
      <h2 class="text-xs font-bold uppercase tracking-wider text-ink-faint">
        Deleted documents ({{ deletedDocs.length }})
      </h2>
      <div class="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
        <table class="w-full text-left text-xs">
          <thead class="border-b border-line bg-canvas/40 text-ink-faint">
            <tr>
              <th class="px-3 py-2.5">Document #</th>
              <th class="px-3 py-2.5">Title &amp; file</th>
              <th class="px-3 py-2.5">Revision</th>
              <th class="px-3 py-2.5">Size</th>
              <th class="px-3 py-2.5">Deleted date</th>
              <th class="px-3 py-2.5">Deleted by</th>
              <th class="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="d in deletedDocs" :key="d.id" class="hover:bg-canvas/20">
              <td class="px-3 py-2 font-mono font-bold text-primary">
                {{ d.documentNumber }}
              </td>
              <td class="px-3 py-2">
                <p class="font-semibold text-ink">{{ d.title }}</p>
                <p class="text-[11px] text-ink-faint">{{ d.fileName }}</p>
              </td>
              <td class="px-3 py-2">
                <span class="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  v{{ d.versionLabel }}
                </span>
              </td>
              <td class="px-3 py-2 text-ink-faint">
                {{ formatBytes(d.fileSize) }}
              </td>
              <td class="px-3 py-2 text-ink-faint">
                {{ d.deletedAt ? new Date(d.deletedAt).toLocaleDateString() : '—' }}
              </td>
              <td class="px-3 py-2 text-ink-faint">
                {{ d.deletedBy || 'System' }}
              </td>
              <td class="px-3 py-2 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="font-semibold text-primary hover:underline"
                    @click="handleRestore(d)"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    class="font-semibold text-red-600 hover:underline"
                    @click="handlePurge(d)"
                  >
                    Purge
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!deletedDocs.length">
              <td colspan="7" class="py-8 text-center text-ink-faint">
                No deleted documents in recycle bin.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
