<script setup lang="ts">
import { useDocuments, useDocumentsUnitId } from '../../features/documents/useDocuments'
import type { DmSummary, DmFolder, DmTemplate } from '../../features/documents/document-types'
import { documentPages } from '../../features/documents/navigation'
import DocumentUploadModal from '../../features/documents/components/DocumentUploadModal.vue'

definePageMeta({ layout: 'admin-dm' })
useHead({ title: 'Document Management' })

const api = useDocuments()
const unitId = useDocumentsUnitId()
const summary = ref<DmSummary>({
  totalDocuments: 0,
  totalFolders: 0,
  totalStorageBytes: 0,
  pendingApprovals: 0,
  activeCheckouts: 0,
  expiredDocuments: 0,
  statusBreakdown: {},
  templateBreakdown: {},
  recentActivity: [],
})
const loading = ref(false)
const error = ref('')

const uploadOpen = ref(false)
const folders = ref<DmFolder[]>([])
const templates = ref<DmTemplate[]>([])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [sData, fData, tData] = await Promise.all([
      api.summary(),
      api.folders().catch(() => []),
      api.templates().catch(() => []),
    ])
    summary.value = sData
    folders.value = fData
    templates.value = tData
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not load Document Management overview.'
  } finally {
    loading.value = false
  }
}

watch(unitId, load)
onMounted(load)

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const workspaces = documentPages.filter((p) => p.path !== '/documents')
</script>

<template>
  <section class="space-y-8" :aria-busy="loading">
    <PageHeader
      title="Document Management"
      subtitle="Organize business records, templates, revisions, approval workflows, and fast retrieval."
      icon="document-text"
    >
      <BaseButton variant="primary" @click="uploadOpen = true">
        <AppIcon name="plus" :size="16" class="mr-1" /> Upload document
      </BaseButton>
    </PageHeader>

    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

    <!-- Stat Cards -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Documents indexed"
        :value="summary.totalDocuments"
        icon="document-text"
        tone="primary"
      />
      <StatCard
        label="Repository folders"
        :value="summary.totalFolders"
        icon="folder"
        tone="blue"
      />
      <StatCard
        label="Storage used"
        :value="formatBytes(summary.totalStorageBytes)"
        icon="server"
        tone="purple"
      />
      <StatCard
        label="Pending approvals"
        :value="summary.pendingApprovals"
        icon="document-check"
        tone="amber"
      />
      <StatCard
        label="Active checkouts"
        :value="summary.activeCheckouts"
        icon="lock-closed"
        tone="green"
      />
      <StatCard
        label="Retention due / expired"
        :value="summary.expiredDocuments"
        icon="shield-check"
        tone="red"
      />
    </div>

    <!-- Main Grid: Activity and Status Breakdown -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Recent Activity Stream -->
      <div class="rounded-xl border border-line bg-surface p-5 lg:col-span-2 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-ink">Recent document activity</h2>
            <p class="text-xs text-ink-faint">Audit log stream of latest record events</p>
          </div>
          <NuxtLink to="/documents/audit" class="text-xs font-semibold text-primary hover:underline">
            View full log →
          </NuxtLink>
        </div>

        <div v-if="summary.recentActivity?.length" class="space-y-2">
          <div
            v-for="act in summary.recentActivity"
            :key="act.id"
            class="flex items-center justify-between rounded-lg border border-line/60 bg-canvas/30 px-3 py-2 text-xs"
          >
            <div class="flex items-center gap-2">
              <span class="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary">
                {{ act.eventType }}
              </span>
              <span class="font-bold text-ink">{{ act.documentNumber }}</span>
              <span class="truncate text-ink-soft">{{ act.documentTitle }}</span>
              <span class="text-ink-faint">by {{ act.userName }}</span>
            </div>
            <span class="text-[11px] text-ink-faint">{{ new Date(act.createdAt).toLocaleDateString() }}</span>
          </div>
        </div>
        <div v-else class="py-8 text-center text-xs text-ink-faint">
          No recent document events recorded.
        </div>
      </div>

      <!-- Breakdown & Health -->
      <div class="space-y-4">
        <!-- Status Breakdown -->
        <div class="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <h2 class="mb-3 text-sm font-bold text-ink">Documents by status</h2>
          <div class="space-y-2 text-xs">
            <div
              v-for="(count, st) in summary.statusBreakdown"
              :key="st"
              class="flex items-center justify-between rounded bg-canvas px-2.5 py-1.5"
            >
              <span class="capitalize text-ink-soft">{{ String(st).replace('_', ' ') }}</span>
              <span class="font-bold text-ink">{{ count }}</span>
            </div>
            <div v-if="!Object.keys(summary.statusBreakdown || {}).length" class="py-4 text-center text-xs text-ink-faint">
              No documents yet
            </div>
          </div>
        </div>

        <!-- Template Breakdown -->
        <div class="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <h2 class="mb-3 text-sm font-bold text-ink">Documents by type / template</h2>
          <div class="space-y-2 text-xs">
            <div
              v-for="(count, tmpl) in summary.templateBreakdown"
              :key="tmpl"
              class="flex items-center justify-between rounded bg-canvas px-2.5 py-1.5"
            >
              <span class="truncate text-ink-soft">{{ tmpl }}</span>
              <span class="font-bold text-ink">{{ count }}</span>
            </div>
            <div v-if="!Object.keys(summary.templateBreakdown || {}).length" class="py-4 text-center text-xs text-ink-faint">
              No templates used yet
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Module Workspaces -->
    <div>
      <h2 class="mb-3 text-sm font-bold text-ink">Document Management workspaces</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="ws in workspaces"
          :key="ws.path"
          :to="ws.path"
          class="group rounded-xl border border-line bg-surface p-4 transition hover:border-primary/40 hover:shadow-sm"
        >
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary group-hover:bg-primary group-hover:text-on-primary">
              <AppIcon :name="ws.icon" :size="20" />
            </span>
            <div>
              <h3 class="text-sm font-semibold text-ink group-hover:text-primary">{{ ws.title }}</h3>
              <p class="text-xs text-ink-faint">{{ ws.description }}</p>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Upload Modal -->
    <DocumentUploadModal
      :open="uploadOpen"
      :folders="folders"
      :templates="templates"
      @close="uploadOpen = false"
      @created="load"
    />
  </section>
</template>
