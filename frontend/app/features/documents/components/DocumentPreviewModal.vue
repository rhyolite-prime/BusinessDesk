<script setup lang="ts">
import type {
  DmDocument,
  DmVersion,
  DmWorkflow,
  DmNote,
  DmRelation,
  DmAuditEvent,
  DmAnnotation,
  DmAclEntry,
  DmShare,
  DmEntityLink,
} from '../document-types'
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
const activeTab = ref<'preview' | 'properties' | 'versions' | 'workflow' | 'notes' | 'relations' | 'annotations' | 'acl' | 'shares' | 'entityLinks' | 'ai' | 'audit'>('preview')

const versions = ref<DmVersion[]>([])
const workflows = ref<DmWorkflow[]>([])
const notes = ref<DmNote[]>([])
const relations = ref<DmRelation[]>([])
const auditLogs = ref<DmAuditEvent[]>([])
const annotations = ref<DmAnnotation[]>([])
const aclEntries = ref<DmAclEntry[]>([])
const shares = ref<DmShare[]>([])
const entityLinks = ref<DmEntityLink[]>([])

const newNote = ref('')
const noteLoading = ref(false)

const newRelationTargetId = ref('')
const newRelationType = ref('relates_to')
const relationLoading = ref(false)

const allDocs = ref<Array<{ id: string; title: string; documentNumber: string }>>([])

// Annotation form
const newAnnotPage = ref(1)
const newAnnotType = ref<'highlight' | 'note' | 'rect'>('highlight')
const newAnnotColor = ref('#ffeb3b')
const newAnnotContent = ref('')

// ACL form
const newAclPrincType = ref('user')
const newAclPrincId = ref('')
const newAclPerm = ref<'read' | 'write' | 'delete' | 'share' | 'sign' | 'admin'>('read')
const newAclAccess = ref<'allow' | 'deny'>('allow')

// Share form
const newShareEmail = ref('')
const newShareCanDl = ref(true)
const newShareCanCom = ref(false)
const newShareMaxCount = ref(0)
const createdShareToken = ref('')

// Entity Link form
const newEntType = ref('gl_journal')
const newEntId = ref('')
const newEntRef = ref('')
const newEntCat = ref('attachment')

// AI state
const aiCategory = ref('')
const aiConfidence = ref(0)
const aiSignals = ref<string[]>([])
const aiClassifying = ref(false)
const ragQueryText = ref('')
const ragAnswer = ref('')
const ragCitations = ref<any[]>([])
const ragLoading = ref(false)

async function loadDetails() {
  if (!props.document) return
  try {
    const docId = props.document.id
    const [vList, wList, nList, rList, aList, annotList, aclList, shList, elList] = await Promise.all([
      api.versions(docId).catch(() => []),
      api.workflows({ documentId: docId }).then((r) => r.data).catch(() => []),
      api.notes(docId).catch(() => []),
      api.relations(docId).catch(() => []),
      api.audit({ documentId: docId }).then((r) => r.data).catch(() => []),
      api.annotations(docId).catch(() => []),
      api.aclEntries('document', docId).catch(() => []),
      api.shares(docId).catch(() => []),
      api.entityLinks(docId).catch(() => []),
    ])
    versions.value = vList
    workflows.value = wList
    notes.value = nList
    relations.value = rList
    auditLogs.value = aList
    annotations.value = annotList
    aclEntries.value = aclList
    shares.value = shList
    entityLinks.value = elList
  } catch (e) {
    // Ignore error
  }
}

async function handleAddAnnotation() {
  if (!props.document || !newAnnotContent.value.trim()) return
  try {
    await api.createAnnotation(props.document.id, {
      pageNumber: newAnnotPage.value,
      annotationType: newAnnotType.value,
      color: newAnnotColor.value,
      content: newAnnotContent.value.trim(),
    })
    newAnnotContent.value = ''
    annotations.value = await api.annotations(props.document.id)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not add annotation.')
  }
}

async function handleDeleteAnnotation(id: string) {
  if (!props.document) return
  try {
    await api.deleteAnnotation(props.document.id, id)
    annotations.value = await api.annotations(props.document.id)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not delete annotation.')
  }
}

async function handleAddAcl() {
  if (!props.document || !newAclPrincId.value.trim()) return
  try {
    await api.createAclEntry({
      entityType: 'document',
      entityId: props.document.id,
      principalType: newAclPrincType.value,
      principalId: newAclPrincId.value.trim(),
      permission: newAclPerm.value,
      accessType: newAclAccess.value,
    })
    newAclPrincId.value = ''
    aclEntries.value = await api.aclEntries('document', props.document.id)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not add ACL rule.')
  }
}

async function handleDeleteAcl(id: string) {
  if (!props.document) return
  try {
    await api.deleteAclEntry(id)
    aclEntries.value = await api.aclEntries('document', props.document.id)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not remove ACL rule.')
  }
}

async function handleCreateShare() {
  if (!props.document) return
  try {
    const sh = await api.createShare(props.document.id, {
      recipientEmail: newShareEmail.value.trim() || undefined,
      canDownload: newShareCanDl.value,
      canComment: newShareCanCom.value,
      maxAccessCount: newShareMaxCount.value || undefined,
    })
    createdShareToken.value = sh.shareToken
    shares.value = await api.shares(props.document.id)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not generate share link.')
  }
}

async function handleRevokeShare(id: string) {
  if (!props.document) return
  try {
    await api.revokeShare(id)
    shares.value = await api.shares(props.document.id)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not revoke share.')
  }
}

async function handleAddEntityLink() {
  if (!props.document || !newEntId.value.trim()) return
  try {
    await api.createEntityLink(props.document.id, {
      entityType: newEntType.value,
      entityId: newEntId.value.trim(),
      referenceNumber: newEntRef.value.trim(),
      linkCategory: newEntCat.value,
    })
    newEntId.value = ''
    newEntRef.value = ''
    entityLinks.value = await api.entityLinks(props.document.id)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not link ERP entity.')
  }
}

async function handleRemoveEntityLink(id: string) {
  if (!props.document) return
  try {
    await api.deleteEntityLink(id)
    entityLinks.value = await api.entityLinks(props.document.id)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not unlink ERP entity.')
  }
}

async function handleRunClassify() {
  if (!props.document) return
  aiClassifying.value = true
  try {
    const res = await api.classify(props.document.id)
    aiCategory.value = res.category
    aiConfidence.value = res.confidence
    aiSignals.value = res.signals
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Classification failed.')
  } finally {
    aiClassifying.value = false
  }
}

async function handleRunRag() {
  if (!ragQueryText.value.trim()) return
  ragLoading.value = true
  try {
    const res = await api.ragQuery(ragQueryText.value.trim())
    ragAnswer.value = res.answer
    ragCitations.value = res.citations
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'RAG search failed.')
  } finally {
    ragLoading.value = false
  }
}
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
          :class="activeTab === 'annotations' ? 'border-primary text-primary font-bold' : 'border-transparent hover:text-ink'"
          @click="activeTab = 'annotations'"
        >
          Annotations ({{ annotations.length }})
        </button>
        <button
          type="button"
          class="border-b-2 px-3 py-2 transition"
          :class="activeTab === 'acl' ? 'border-primary text-primary font-bold' : 'border-transparent hover:text-ink'"
          @click="activeTab = 'acl'"
        >
          ACL ({{ aclEntries.length }})
        </button>
        <button
          type="button"
          class="border-b-2 px-3 py-2 transition"
          :class="activeTab === 'shares' ? 'border-primary text-primary font-bold' : 'border-transparent hover:text-ink'"
          @click="activeTab = 'shares'"
        >
          Shares ({{ shares.length }})
        </button>
        <button
          type="button"
          class="border-b-2 px-3 py-2 transition"
          :class="activeTab === 'entityLinks' ? 'border-primary text-primary font-bold' : 'border-transparent hover:text-ink'"
          @click="activeTab = 'entityLinks'"
        >
          ERP Links ({{ entityLinks.length }})
        </button>
        <button
          type="button"
          class="border-b-2 px-3 py-2 transition"
          :class="activeTab === 'ai' ? 'border-primary text-primary font-bold' : 'border-transparent hover:text-ink'"
          @click="activeTab = 'ai'"
        >
          AI Assistant
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

      <!-- Tab 8: Annotations -->
      <div v-if="activeTab === 'annotations'" class="space-y-3">
        <div class="rounded-lg border border-line bg-canvas/30 p-3 space-y-2">
          <h4 class="text-xs font-semibold text-ink">Add Page Annotation</h4>
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <label class="text-[10px] font-medium text-ink-faint">Page</label>
              <input
                v-model.number="newAnnotPage"
                type="number"
                min="1"
                class="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
              />
            </div>
            <div>
              <label class="text-[10px] font-medium text-ink-faint">Type</label>
              <select
                v-model="newAnnotType"
                class="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
              >
                <option value="highlight">Highlight</option>
                <option value="note">Sticky Note</option>
                <option value="rect">Rectangle</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] font-medium text-ink-faint">Color</label>
              <div class="mt-1 flex items-center gap-1.5">
                <input
                  v-model="newAnnotColor"
                  type="color"
                  class="h-7 w-8 cursor-pointer rounded border border-line bg-transparent p-0"
                />
                <span class="text-[10px] font-mono text-ink-faint">{{ newAnnotColor }}</span>
              </div>
            </div>
            <div class="sm:col-span-4">
              <label class="text-[10px] font-medium text-ink-faint">Annotation Content / Comment</label>
              <div class="mt-1 flex gap-2">
                <input
                  v-model="newAnnotContent"
                  type="text"
                  placeholder="Enter annotation content or comment..."
                  class="flex-1 rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
                />
                <BaseButton size="sm" variant="primary" @click="handleAddAnnotation">
                  Add
                </BaseButton>
              </div>
            </div>
          </div>
        </div>

        <div v-if="annotations.length" class="space-y-1.5 max-h-56 overflow-y-auto">
          <div
            v-for="a in annotations"
            :key="a.id"
            class="flex items-center justify-between rounded-lg border border-line bg-surface p-2 text-xs"
          >
            <div class="flex items-center gap-2">
              <span class="inline-block h-3 w-3 rounded-full border border-black/10" :style="{ backgroundColor: a.color || '#ffeb3b' }" />
              <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                P.{{ a.pageNumber }}
              </span>
              <span class="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                {{ a.annotationType }}
              </span>
              <span class="text-ink font-medium">{{ a.content || '(visual marker)' }}</span>
            </div>
            <button
              type="button"
              class="text-ink-faint hover:text-red-600"
              title="Delete annotation"
              @click="handleDeleteAnnotation(a.id)"
            >
              <AppIcon name="trash" :size="14" />
            </button>
          </div>
        </div>
        <div v-else class="py-6 text-center text-xs text-ink-faint">
          No annotations placed on this document yet.
        </div>
      </div>

      <!-- Tab 9: ACL & Permissions -->
      <div v-if="activeTab === 'acl'" class="space-y-3">
        <div class="rounded-lg border border-line bg-canvas/30 p-3 space-y-2">
          <h4 class="text-xs font-semibold text-ink">Grant Permission / Rule</h4>
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <label class="text-[10px] font-medium text-ink-faint">Principal Type</label>
              <select
                v-model="newAclPrincType"
                class="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
              >
                <option value="user">User</option>
                <option value="role">Role</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] font-medium text-ink-faint">Principal ID / Name</label>
              <input
                v-model="newAclPrincId"
                type="text"
                placeholder="e.g. auditor or user UUID"
                class="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
              />
            </div>
            <div>
              <label class="text-[10px] font-medium text-ink-faint">Permission</label>
              <select
                v-model="newAclPerm"
                class="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
              >
                <option value="read">Read</option>
                <option value="write">Write</option>
                <option value="delete">Delete</option>
                <option value="share">Share</option>
                <option value="sign">Sign</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] font-medium text-ink-faint">Access</label>
              <div class="mt-1 flex gap-2">
                <select
                  v-model="newAclAccess"
                  class="flex-1 rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
                >
                  <option value="allow">Allow</option>
                  <option value="deny">Deny</option>
                </select>
                <BaseButton size="sm" variant="primary" @click="handleAddAcl">
                  Grant
                </BaseButton>
              </div>
            </div>
          </div>
        </div>

        <div v-if="aclEntries.length" class="space-y-1.5 max-h-56 overflow-y-auto">
          <div
            v-for="entry in aclEntries"
            :key="entry.id"
            class="flex items-center justify-between rounded-lg border border-line bg-surface p-2 text-xs"
          >
            <div class="flex items-center gap-2">
              <span
                class="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                :class="entry.accessType === 'allow' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'"
              >
                {{ entry.accessType }}
              </span>
              <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {{ entry.principalType }}: {{ entry.principalId }}
              </span>
              <span class="font-medium text-ink capitalize">{{ entry.permission }}</span>
            </div>
            <button
              type="button"
              class="text-ink-faint hover:text-red-600"
              title="Delete rule"
              @click="handleDeleteAcl(entry.id)"
            >
              <AppIcon name="trash" :size="14" />
            </button>
          </div>
        </div>
        <div v-else class="py-6 text-center text-xs text-ink-faint">
          Inheriting permissions from folder &amp; collection hierarchy.
        </div>
      </div>

      <!-- Tab 10: Secure Shares -->
      <div v-if="activeTab === 'shares'" class="space-y-3">
        <div class="rounded-lg border border-line bg-canvas/30 p-3 space-y-2">
          <h4 class="text-xs font-semibold text-ink">Generate Time-Bounded Secure Share Link</h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label class="text-[10px] font-medium text-ink-faint">Recipient Email (Optional)</label>
              <input
                v-model="newShareEmail"
                type="email"
                placeholder="external.partner@example.com"
                class="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
              />
            </div>
            <div>
              <label class="text-[10px] font-medium text-ink-faint">Access Limit (0 for unlimited)</label>
              <input
                v-model.number="newShareMaxCount"
                type="number"
                min="0"
                class="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
              />
            </div>
            <div class="flex items-end gap-3 pb-1">
              <label class="flex items-center gap-1.5 text-xs text-ink">
                <input v-model="newShareCanDl" type="checkbox" class="rounded border-line" />
                Allow Download
              </label>
              <label class="flex items-center gap-1.5 text-xs text-ink">
                <input v-model="newShareCanCom" type="checkbox" class="rounded border-line" />
                Allow Comment
              </label>
            </div>
          </div>
          <div class="flex justify-end pt-1">
            <BaseButton size="sm" variant="primary" @click="handleCreateShare">
              Generate Share Token
            </BaseButton>
          </div>

          <div v-if="createdShareToken" class="mt-2 rounded border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <div class="font-bold">Share Token Generated:</div>
            <div class="mt-1 select-all font-mono text-[11px] break-all bg-surface p-1 rounded border border-emerald-200 dark:border-emerald-800">
              {{ createdShareToken }}
            </div>
          </div>
        </div>

        <div v-if="shares.length" class="space-y-1.5 max-h-56 overflow-y-auto">
          <div
            v-for="s in shares"
            :key="s.id"
            class="flex items-center justify-between rounded-lg border border-line bg-surface p-2 text-xs"
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono text-[11px] font-bold text-ink">{{ s.shareToken.substring(0, 12) }}...</span>
                <span
                  class="rounded px-1.5 py-0.5 text-[10px] font-medium"
                  :class="s.isRevoked ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'"
                >
                  {{ s.isRevoked ? 'Revoked' : 'Active' }}
                </span>
                <span v-if="s.recipientEmail" class="text-ink-soft">{{ s.recipientEmail }}</span>
              </div>
              <div class="mt-0.5 text-[10px] text-ink-faint">
                Access: {{ s.accessCount }} / {{ s.maxAccessCount ? s.maxAccessCount : 'unlimited' }}
                {{ s.canDownload ? '· Can download' : '' }}
                {{ s.canComment ? '· Can comment' : '' }}
              </div>
            </div>
            <button
              v-if="!s.isRevoked"
              type="button"
              class="text-xs text-red-600 hover:underline"
              @click="handleRevokeShare(s.id)"
            >
              Revoke
            </button>
          </div>
        </div>
        <div v-else class="py-6 text-center text-xs text-ink-faint">
          No external shares generated yet.
        </div>
      </div>

      <!-- Tab 11: ERP Entity Links -->
      <div v-if="activeTab === 'entityLinks'" class="space-y-3">
        <div class="rounded-lg border border-line bg-canvas/30 p-3 space-y-2">
          <h4 class="text-xs font-semibold text-ink">Link Document to ERP Transaction or Master Record</h4>
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <label class="text-[10px] font-medium text-ink-faint">ERP Entity Type</label>
              <select
                v-model="newEntType"
                class="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
              >
                <option value="gl_journal">GL Journal Entry</option>
                <option value="supplier_voucher">Supplier Voucher / AP</option>
                <option value="customer_invoice">Customer Invoice / AR</option>
                <option value="procurement_order">Purchase Order (PO)</option>
                <option value="fleet_vehicle">Fleet Vehicle Record</option>
                <option value="employee">Employee HR File</option>
                <option value="fixed_asset">Fixed Asset</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] font-medium text-ink-faint">Entity UUID</label>
              <input
                v-model="newEntId"
                type="text"
                placeholder="UUID of ERP record"
                class="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
              />
            </div>
            <div>
              <label class="text-[10px] font-medium text-ink-faint">Reference Number</label>
              <input
                v-model="newEntRef"
                type="text"
                placeholder="e.g. PO-2026-0042"
                class="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
              />
            </div>
            <div>
              <label class="text-[10px] font-medium text-ink-faint">Category</label>
              <div class="mt-1 flex gap-2">
                <select
                  v-model="newEntCat"
                  class="flex-1 rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
                >
                  <option value="attachment">Attachment</option>
                  <option value="invoice">Invoice</option>
                  <option value="receipt">Receipt</option>
                  <option value="contract">Contract</option>
                  <option value="compliance">Compliance</option>
                </select>
                <BaseButton size="sm" variant="primary" @click="handleAddEntityLink">
                  Link
                </BaseButton>
              </div>
            </div>
          </div>
        </div>

        <div v-if="entityLinks.length" class="space-y-1.5 max-h-56 overflow-y-auto">
          <div
            v-for="link in entityLinks"
            :key="link.id"
            class="flex items-center justify-between rounded-lg border border-line bg-surface p-2 text-xs"
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                  {{ link.entityType.replace('_', ' ') }}
                </span>
                <span class="font-bold text-ink">{{ link.referenceNumber || link.entityId }}</span>
                <span class="text-[10px] text-ink-faint capitalize">({{ link.linkCategory }})</span>
              </div>
              <div class="mt-0.5 text-[10px] text-ink-faint font-mono">
                Entity ID: {{ link.entityId }}
              </div>
            </div>
            <button
              type="button"
              class="text-ink-faint hover:text-red-600"
              title="Unlink record"
              @click="handleRemoveEntityLink(link.id)"
            >
              <AppIcon name="trash" :size="14" />
            </button>
          </div>
        </div>
        <div v-else class="py-6 text-center text-xs text-ink-faint">
          No ERP business entities linked to this document.
        </div>
      </div>

      <!-- Tab 12: Deterministic AI Assistant -->
      <div v-if="activeTab === 'ai'" class="space-y-4">
        <!-- Classification Section -->
        <div class="rounded-lg border border-line bg-canvas/30 p-3 space-y-2">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-xs font-semibold text-ink">Heuristic Document Classification</h4>
              <p class="text-[11px] text-ink-faint">Analyzes document title, metadata, and extracted text to classify type.</p>
            </div>
            <BaseButton
              size="sm"
              variant="secondary"
              :disabled="aiClassifying"
              @click="handleRunClassify"
            >
              <AppIcon v-if="aiClassifying" name="arrow-path" class="animate-spin mr-1" :size="14" />
              {{ aiClassifying ? 'Analyzing...' : 'Classify Type' }}
            </BaseButton>
          </div>

          <div v-if="aiCategory" class="mt-2 rounded-lg border border-line bg-surface p-2.5 text-xs space-y-1.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-ink">Detected Category:</span>
                <span class="rounded bg-primary-soft px-2 py-0.5 font-bold uppercase text-primary text-[11px]">
                  {{ aiCategory }}
                </span>
              </div>
              <span class="text-[10px] text-ink-faint">
                Confidence: <strong class="text-ink">{{ Math.round(aiConfidence * 100) }}%</strong>
              </span>
            </div>
            <div v-if="aiSignals.length" class="text-[10px] text-ink-soft">
              <span class="font-semibold">Matched Signals: </span>
              <span class="font-mono">{{ aiSignals.join(', ') }}</span>
            </div>
          </div>
        </div>

        <!-- Extractive RAG Section -->
        <div class="rounded-lg border border-line bg-canvas/30 p-3 space-y-2">
          <h4 class="text-xs font-semibold text-ink">Deterministic Extractive RAG</h4>
          <p class="text-[11px] text-ink-faint">
            Searches vector embeddings generated with 256-dim FNV-1a hashing and retrieves exact citation passages.
          </p>

          <div class="flex gap-2">
            <input
              v-model="ragQueryText"
              type="text"
              placeholder="Ask a question (e.g. 'What is the payment due date and contract terms?')..."
              class="flex-1 rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
              @keydown.enter.prevent="handleRunRag"
            />
            <BaseButton
              size="sm"
              variant="primary"
              :disabled="ragLoading || !ragQueryText.trim()"
              @click="handleRunRag"
            >
              <AppIcon v-if="ragLoading" name="arrow-path" class="animate-spin mr-1" :size="14" />
              {{ ragLoading ? 'Searching...' : 'Ask RAG' }}
            </BaseButton>
          </div>

          <div v-if="ragAnswer" class="mt-2 rounded-lg border border-line bg-surface p-3 text-xs space-y-2">
            <div>
              <span class="font-bold text-ink">Synthesized Extracted Answer:</span>
              <p class="mt-1 leading-relaxed text-ink-soft">{{ ragAnswer }}</p>
            </div>

            <div v-if="ragCitations.length" class="border-t border-line pt-2">
              <span class="text-[10px] font-bold uppercase text-ink-faint">Citations &amp; Grounding Passages:</span>
              <div class="mt-1 space-y-1">
                <div
                  v-for="(cit, idx) in ragCitations"
                  :key="idx"
                  class="rounded bg-canvas/60 p-2 text-[11px] border border-line/60"
                >
                  <div class="flex items-center justify-between text-ink font-semibold">
                    <span>Source Document: {{ cit.documentTitle || cit.documentId }}</span>
                    <span v-if="cit.pageNumber" class="text-ink-faint text-[10px]">Page {{ cit.pageNumber }}</span>
                  </div>
                  <p class="mt-0.5 italic text-ink-soft">"{{ cit.snippet }}"</p>
                </div>
              </div>
            </div>
          </div>
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
