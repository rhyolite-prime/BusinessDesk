<script setup lang="ts">
import type { DmDocument, DmVersion, DmWorkflow, DmNote, DmRelation, DmAuditEvent } from '../document-types'
import { useDocuments } from '../useDocuments'

const props = defineProps<{
  open: boolean
  document: DmDocument | null
}>()

const emit = defineEmits<{
  close: []
  updated: []
  checkout: [doc: DmDocument]
  checkin: [doc: DmDocument]
  workflow: [doc: DmDocument]
}>()

const api = useDocuments()
const activeTab = ref<'preview' | 'properties' | 'versions' | 'workflow' | 'notes' | 'relations' | 'audit'>('preview')

const versions = ref<DmVersion[]>([])
const workflows = ref<DmWorkflow[]>([])
const notes = ref<DmNote[]>([])
const relations = ref<DmRelation[]>([])
const auditLogs = ref<DmAuditEvent[]>([])

const newNote = ref('')
const noteLoading = ref(false)

const newRelationTargetId = ref('')
const newRelationType = ref('relates_to')
const relationLoading = ref(false)

const allDocs = ref<Array<{ id: string; title: string; documentNumber: string }>>([])

async function loadDetails() {
  if (!props.document) return
  try {
    const docId = props.document.id
    const [vList, wList, nList, rList, aList] = await Promise.all([
      api.versions(docId).catch(() => []),
      api.workflows({ documentId: docId }).then((r) => r.data).catch(() => []),
      api.notes(docId).catch(() => []),
      api.relations(docId).catch(() => []),
      api.audit({ documentId: docId }).then((r) => r.data).catch(() => []),
    ])
    versions.value = vList
    workflows.value = wList
    notes.value = nList
    relations.value = rList
    auditLogs.value = aList
  } catch (e) {
    // Ignore error
  }
}

watch(
  () => props.document,
  (d) => {
    if (d) {
      activeTab.value = 'preview'
      void loadDetails()
      void loadAvailableDocs()
    }
  },
  { immediate: true },
)

async function loadAvailableDocs() {
  try {
    const r = await api.documents({ size: 100 })
    allDocs.value = r.data
      .filter((d) => d.id !== props.document?.id)
      .map((d) => ({ id: d.id, title: d.title, documentNumber: d.documentNumber }))
  } catch {
    allDocs.value = []
  }
}

async function handleAddNote() {
  if (!props.document || !newNote.value.trim()) return
  noteLoading.value = true
  try {
    await api.addNote(props.document.id, { noteText: newNote.value.trim() })
    newNote.value = ''
    notes.value = await api.notes(props.document.id)
    emit('updated')
  } finally {
    noteLoading.value = false
  }
}

async function handleAddRelation() {
  if (!props.document || !newRelationTargetId.value) return
  relationLoading.value = true
  try {
    await api.addRelation(props.document.id, {
      targetDocumentId: newRelationTargetId.value,
      relationType: newRelationType.value,
    })
    newRelationTargetId.value = ''
    relations.value = await api.relations(props.document.id)
    emit('updated')
  } finally {
    relationLoading.value = false
  }
}

async function handleRemoveRelation(relId: string) {
  if (!props.document) return
  await api.removeRelation(props.document.id, relId)
  relations.value = await api.relations(props.document.id)
  emit('updated')
}

async function handleRevert(versionId: string) {
  if (!props.document) return
  if (!confirm('Revert document to this version? A new revision will be created with its contents.')) return
  await api.revertVersion(props.document.id, versionId)
  await loadDetails()
  emit('updated')
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
  <ModalShell
    :open="open"
    :title="document ? `${document.documentNumber} · ${document.title}` : 'Document preview'"
    :subtitle="document?.fileName"
    width="max-w-4xl"
    @close="emit('close')"
  >
    <div v-if="document" class="space-y-4">
      <!-- Status & Quick Action Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas/40 px-4 py-3">
        <div class="flex flex-wrap items-center gap-2">
          <Badge :variant="document.status === 'published' ? 'success' : document.status === 'under_review' ? 'warning' : 'neutral'">
            {{ document.status.replace('_', ' ') }}
          </Badge>
          <span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            v{{ document.versionLabel }}
          </span>
          <span v-if="document.isCheckedOut" class="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AppIcon name="lock-closed" :size="12" /> Checked out ({{ document.checkedOutByUserName || 'by you' }})
          </span>
          <span v-if="document.isLocked" class="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/40 dark:text-red-300">
            <AppIcon name="lock-closed" :size="12" /> Locked
          </span>
        </div>

        <div class="flex items-center gap-2">
          <BaseButton
            v-if="document.canCheckOut"
            size="sm"
            variant="secondary"
            @click="emit('checkout', document)"
          >
            Check out
          </BaseButton>
          <BaseButton
            v-if="document.canCheckIn"
            size="sm"
            variant="primary"
            @click="emit('checkin', document)"
          >
            Check in revision
          </BaseButton>
          <BaseButton
            size="sm"
            variant="secondary"
            @click="emit('workflow', document)"
          >
            Workflow action
          </BaseButton>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex border-b border-line text-xs font-medium text-ink-faint">
        <button
          type="button"
          class="border-b-2 px-3 py-2 transition"
          :class="activeTab === 'preview' ? 'border-primary text-primary font-bold' : 'border-transparent hover:text-ink'"
          @click="activeTab = 'preview'"
        >
          Preview &amp; file
        </button>
        <button
          type="button"
          class="border-b-2 px-3 py-2 transition"
          :class="activeTab === 'properties' ? 'border-primary text-primary font-bold' : 'border-transparent hover:text-ink'"
          @click="activeTab = 'properties'"
        >
          Metadata
        </button>
        <button
          type="button"
          class="border-b-2 px-3 py-2 transition"
          :class="activeTab === 'versions' ? 'border-primary text-primary font-bold' : 'border-transparent hover:text-ink'"
          @click="activeTab = 'versions'"
        >
          Versions ({{ versions.length }})
        </button>
        <button
          type="button"
          class="border-b-2 px-3 py-2 transition"
          :class="activeTab === 'workflow' ? 'border-primary text-primary font-bold' : 'border-transparent hover:text-ink'"
          @click="activeTab = 'workflow'"
        >
          Workflows
        </button>
        <button
          type="button"
          class="border-b-2 px-3 py-2 transition"
          :class="activeTab === 'notes' ? 'border-primary text-primary font-bold' : 'border-transparent hover:text-ink'"
          @click="activeTab = 'notes'"
        >
          Notes ({{ notes.length }})
        </button>
        <button
          type="button"
          class="border-b-2 px-3 py-2 transition"
          :class="activeTab === 'relations' ? 'border-primary text-primary font-bold' : 'border-transparent hover:text-ink'"
          @click="activeTab = 'relations'"
        >
          Relations ({{ relations.length }})
        </button>
        <button
          type="button"
          class="border-b-2 px-3 py-2 transition"
          :class="activeTab === 'audit' ? 'border-primary text-primary font-bold' : 'border-transparent hover:text-ink'"
          @click="activeTab = 'audit'"
        >
          Audit log
        </button>
      </div>

      <!-- Tab 1: Preview & File Info -->
      <div v-if="activeTab === 'preview'" class="space-y-4">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
          <div class="rounded-lg border border-line bg-canvas/30 p-2.5">
            <span class="text-ink-faint">File size</span>
            <p class="mt-1 font-semibold text-ink">{{ formatBytes(document.fileSize) }}</p>
          </div>
          <div class="rounded-lg border border-line bg-canvas/30 p-2.5">
            <span class="text-ink-faint">MIME type</span>
            <p class="mt-1 truncate font-semibold text-ink">{{ document.mimeType }}</p>
          </div>
          <div class="rounded-lg border border-line bg-canvas/30 p-2.5">
            <span class="text-ink-faint">Language</span>
            <p class="mt-1 uppercase font-semibold text-ink">{{ document.language }}</p>
          </div>
          <div class="rounded-lg border border-line bg-canvas/30 p-2.5">
            <span class="text-ink-faint">Folder</span>
            <p class="mt-1 truncate font-semibold text-ink">{{ document.folderName || 'Root' }}</p>
          </div>
        </div>

        <div class="rounded-xl border border-line bg-surface p-4">
          <h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">Document text / content</h3>
          <div v-if="document.contentText" class="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-canvas p-3 font-mono text-xs text-ink">
            {{ document.contentText }}
          </div>
          <div v-else class="py-8 text-center text-xs text-ink-faint">
            Binary file or no text preview available for {{ document.fileName }}
          </div>
        </div>
      </div>

      <!-- Tab 2: Properties & Metadata -->
      <div v-if="activeTab === 'properties'" class="space-y-4">
        <div class="rounded-xl border border-line bg-surface p-4 text-xs space-y-3">
          <div>
            <span class="font-semibold text-ink-faint">Description:</span>
            <p class="mt-1 text-ink">{{ document.description || 'No description provided.' }}</p>
          </div>
          <div>
            <span class="font-semibold text-ink-faint">Tags:</span>
            <div class="mt-1 flex flex-wrap gap-1">
              <span v-for="tag in document.tags" :key="tag" class="rounded bg-primary-soft px-2 py-0.5 text-xs text-primary">
                {{ tag }}
              </span>
              <span v-if="!document.tags?.length" class="text-ink-faint">None</span>
            </div>
          </div>
          <div v-if="document.templateName">
            <span class="font-semibold text-ink-faint">Template:</span>
            <span class="ml-2 font-medium text-ink">{{ document.templateName }}</span>
          </div>

          <!-- Dynamic Template Attributes -->
          <div v-if="Object.keys(document.attributes || {}).length" class="border-t border-line pt-3">
            <h4 class="mb-2 font-bold uppercase tracking-wider text-ink-faint">Custom template attributes</h4>
            <dl class="grid grid-cols-2 gap-2">
              <div v-for="(val, key) in document.attributes" :key="key" class="rounded bg-canvas p-2">
                <dt class="font-semibold capitalize text-ink-faint">{{ key }}</dt>
                <dd class="mt-0.5 font-medium text-ink">{{ val }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <!-- Tab 3: Version History -->
      <div v-if="activeTab === 'versions'" class="space-y-3">
        <div class="overflow-x-auto rounded-xl border border-line bg-surface">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-line bg-canvas/40 text-ink-faint">
              <tr>
                <th class="px-3 py-2">Revision</th>
                <th class="px-3 py-2">File name</th>
                <th class="px-3 py-2">Size</th>
                <th class="px-3 py-2">Comment</th>
                <th class="px-3 py-2">Uploader</th>
                <th class="px-3 py-2">Date</th>
                <th class="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="v in versions" :key="v.id" class="hover:bg-canvas/20">
                <td class="px-3 py-2 font-bold text-primary">v{{ v.versionLabel }}</td>
                <td class="px-3 py-2 text-ink">{{ v.fileName }}</td>
                <td class="px-3 py-2 text-ink-faint">{{ formatBytes(v.fileSize) }}</td>
                <td class="px-3 py-2 text-ink-soft">{{ v.comment }}</td>
                <td class="px-3 py-2 text-ink-faint">{{ v.userName }}</td>
                <td class="px-3 py-2 text-ink-faint">{{ new Date(v.createdAt).toLocaleDateString() }}</td>
                <td class="px-3 py-2 text-right">
                  <button
                    v-if="v.versionLabel !== document.versionLabel"
                    type="button"
                    class="font-semibold text-primary hover:underline"
                    @click="handleRevert(v.id)"
                  >
                    Revert
                  </button>
                  <span v-else class="text-[10px] text-emerald-600 font-semibold">Current</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 4: Workflows -->
      <div v-if="activeTab === 'workflow'" class="space-y-3">
        <div v-if="workflows.length" class="space-y-2">
          <div v-for="w in workflows" :key="w.id" class="rounded-xl border border-line bg-surface p-3 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-bold text-ink">{{ w.stepName }}</span>
              <Badge :variant="w.status === 'approved' ? 'success' : w.status === 'rejected' ? 'danger' : 'warning'">
                {{ w.status }}
              </Badge>
            </div>
            <p v-if="w.comments" class="mt-1 text-ink-soft">"{{ w.comments }}"</p>
            <div class="mt-2 text-[11px] text-ink-faint">
              Submitted: {{ new Date(w.createdAt).toLocaleString() }}
              <span v-if="w.decidedAt">· Decided: {{ new Date(w.decidedAt).toLocaleString() }} by {{ w.deciderName || 'Approver' }}</span>
            </div>
          </div>
        </div>
        <div v-else class="py-8 text-center text-xs text-ink-faint">
          No workflow records for this document.
        </div>
      </div>

      <!-- Tab 5: Notes & Discussions -->
      <div v-if="activeTab === 'notes'" class="space-y-4">
        <form class="flex gap-2" @submit.prevent="handleAddNote">
          <input
            v-model="newNote"
            type="text"
            placeholder="Add a comment or discussion note..."
            class="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
          />
          <BaseButton size="sm" variant="primary" :disabled="!newNote.trim() || noteLoading">
            Post note
          </BaseButton>
        </form>

        <div v-if="notes.length" class="space-y-2 max-h-60 overflow-y-auto">
          <div v-for="n in notes" :key="n.id" class="rounded-xl border border-line bg-surface p-3 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-bold text-ink">{{ n.userName }}</span>
              <span class="text-[10px] text-ink-faint">{{ new Date(n.createdAt).toLocaleString() }}</span>
            </div>
            <p class="mt-1 text-ink-soft">{{ n.noteText }}</p>
          </div>
        </div>
        <div v-else class="py-6 text-center text-xs text-ink-faint">
          No comments or notes yet.
        </div>
      </div>

      <!-- Tab 6: Relations -->
      <div v-if="activeTab === 'relations'" class="space-y-4">
        <form class="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-canvas/30 p-3" @submit.prevent="handleAddRelation">
          <select
            v-model="newRelationTargetId"
            class="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-ink"
          >
            <option value="">Select target document...</option>
            <option v-for="d in allDocs" :key="d.id" :value="d.id">
              {{ d.documentNumber }} · {{ d.title }}
            </option>
          </select>
          <select
            v-model="newRelationType"
            class="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-ink"
          >
            <option value="relates_to">Relates to</option>
            <option value="supersedes">Supersedes</option>
            <option value="supports">Supports</option>
            <option value="amends">Amends</option>
          </select>
          <BaseButton size="sm" variant="secondary" :disabled="!newRelationTargetId || relationLoading">
            Link document
          </BaseButton>
        </form>

        <div v-if="relations.length" class="space-y-2">
          <div v-for="r in relations" :key="r.id" class="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-xs">
            <div>
              <span class="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                {{ r.relationType.replace('_', ' ') }}
              </span>
              <span class="ml-2 font-bold text-ink">{{ r.relatedDocumentNumber }}</span>
              <span class="ml-1 text-ink-soft">· {{ r.relatedDocumentTitle }}</span>
              <span class="ml-2 text-[10px] text-ink-faint">(v{{ r.relatedDocumentVersion }})</span>
            </div>
            <button
              type="button"
              class="text-ink-faint hover:text-red-600"
              title="Remove link"
              @click="handleRemoveRelation(r.id)"
            >
              <AppIcon name="trash" :size="14" />
            </button>
          </div>
        </div>
        <div v-else class="py-6 text-center text-xs text-ink-faint">
          No related documents linked.
        </div>
      </div>

      <!-- Tab 7: Audit Log -->
      <div v-if="activeTab === 'audit'" class="space-y-2 max-h-60 overflow-y-auto">
        <div v-if="auditLogs.length" class="space-y-1.5">
          <div v-for="a in auditLogs" :key="a.id" class="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-xs">
            <div class="flex items-center gap-2">
              <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {{ a.eventType }}
              </span>
              <span class="font-medium text-ink">{{ a.userName }}</span>
            </div>
            <span class="text-[10px] text-ink-faint">{{ new Date(a.createdAt).toLocaleString() }}</span>
          </div>
        </div>
        <div v-else class="py-6 text-center text-xs text-ink-faint">
          No audit entries recorded.
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="secondary" @click="emit('close')">
        Close
      </BaseButton>
    </template>
  </ModalShell>
</template>
