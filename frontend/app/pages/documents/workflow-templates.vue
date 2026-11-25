<script setup lang="ts">
import { useDocuments } from '../../features/documents/useDocuments'
import type { DmWorkflowTemplate, DmWorkflowTask } from '../../features/documents/document-types'

definePageMeta({ layout: 'admin-dm' })
useHead({ title: 'Workflow Engine & Templates' })

const api = useDocuments()

const templates = ref<DmWorkflowTemplate[]>([])
const tasks = ref<DmWorkflowTask[]>([])
const loading = ref(false)
const error = ref('')
const activeTab = ref<'templates' | 'tasks'>('templates')
const createModalOpen = ref(false)

const form = reactive({
  name: '',
  description: '',
  triggerType: 'manual' as 'manual' | 'on_upload' | 'on_status',
  steps: [
    { name: 'Initial Compliance Review', taskType: 'review', executionMode: 'sequential', assignedRole: 'Compliance Officer' },
    { name: 'Management Authorization', taskType: 'approval', executionMode: 'parallel', assignedRole: 'Department Head' },
  ],
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [tpls, tsk] = await Promise.all([
      api.workflowTemplates().catch(() => []),
      api.workflowTasks().catch(() => []),
    ])
    templates.value = tpls
    tasks.value = tsk
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not load workflow data.'
  } finally {
    loading.value = false
  }
}

async function handleCreateTemplate() {
  if (!form.name.trim()) return
  try {
    await api.createWorkflowTemplate({
      name: form.name.trim(),
      description: form.description.trim(),
      triggerType: form.triggerType,
      steps: form.steps,
      isActive: true,
    })
    createModalOpen.value = false
    form.name = ''
    form.description = ''
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not create workflow template.')
  }
}

async function handleSweep() {
  try {
    await $fetch('/api/documents/workflow-tasks/sweep', { method: 'POST' })
    alert('Escalation & timeout sweep completed successfully.')
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Timeout sweep failed.')
  }
}

async function handleCompleteTask(task: DmWorkflowTask, decision: 'approved' | 'rejected') {
  try {
    await api.completeWorkflowTask(task.id, decision, `Decided ${decision} via workflow engine`)
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Task update failed.')
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Workflow Engine & Templates</h1>
        <p class="text-sm text-ink-soft">
          Multi-step DAG and sequential workflow engine with parallel/sequential steps, template snapshots, and automatic timeout sweeps.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-primary/40"
          @click="handleSweep"
        >
          Run timeout sweep
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90"
          @click="createModalOpen = true"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          New workflow template
        </button>
      </div>
    </div>

    <div class="flex gap-2 border-b border-line pb-2">
      <button
        type="button"
        :class="[
          'rounded-xl px-4 py-2 text-xs font-semibold transition',
          activeTab === 'templates' ? 'bg-primary text-white' : 'text-ink-soft hover:text-ink',
        ]"
        @click="activeTab = 'templates'"
      >
        Templates ({{ templates.length }})
      </button>
      <button
        type="button"
        :class="[
          'rounded-xl px-4 py-2 text-xs font-semibold transition',
          activeTab === 'tasks' ? 'bg-primary text-white' : 'text-ink-soft hover:text-ink',
        ]"
        @click="activeTab = 'tasks'"
      >
        Active Tasks ({{ tasks.length }})
      </button>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-ink-soft">
      Loading workflow engine...
    </div>

    <!-- Templates Tab -->
    <div v-else-if="activeTab === 'templates'" class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="rounded-2xl border border-line bg-surface p-5 shadow-sm"
      >
        <div class="flex items-center justify-between">
          <span class="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            {{ tpl.triggerType }}
          </span>
          <span class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            Active
          </span>
        </div>
        <h3 class="mt-3 text-base font-bold text-ink">{{ tpl.name }}</h3>
        <p class="mt-1 text-xs text-ink-soft">{{ tpl.description || 'No description.' }}</p>

        <div class="mt-4 space-y-2 border-t border-line/60 pt-3">
          <p class="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Workflow Steps ({{ tpl.steps.length }})</p>
          <div
            v-for="(st, idx) in tpl.steps"
            :key="idx"
            class="flex items-center justify-between rounded-xl bg-canvas p-2.5 text-xs"
          >
            <div class="flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                {{ idx + 1 }}
              </span>
              <span class="font-medium text-ink">{{ st.name }}</span>
            </div>
            <span class="text-[11px] text-ink-soft">{{ st.executionMode }} · {{ st.taskType }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tasks Tab -->
    <div v-else-if="activeTab === 'tasks'" class="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div v-if="!tasks.length" class="py-12 text-center text-xs text-ink-soft">
        No active tasks in progress.
      </div>
      <div v-else class="divide-y divide-line">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="flex flex-wrap items-center justify-between gap-4 py-3"
        >
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-ink">{{ task.stepName }}</span>
              <span class="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                {{ task.status }}
              </span>
            </div>
            <p class="mt-1 text-xs text-ink-soft">
              Document: {{ task.documentNumber || task.documentId }} · {{ task.documentTitle }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              @click="handleCompleteTask(task, 'approved')"
            >
              Approve step
            </button>
            <button
              type="button"
              class="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              @click="handleCompleteTask(task, 'rejected')"
            >
              Reject step
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Template Modal -->
    <div v-if="createModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl">
        <h3 class="text-lg font-bold text-ink">New Workflow Template</h3>
        <p class="text-xs text-ink-soft">Configure automated multi-step decision pipeline.</p>

        <form class="mt-4 space-y-4" @submit.prevent="handleCreateTemplate">
          <div>
            <label class="block text-xs font-semibold text-ink">Template Name</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
              placeholder="e.g. Executive Expenditure Approval"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-ink">Trigger</label>
            <select
              v-model="form.triggerType"
              class="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
            >
              <option value="manual">Manual submission</option>
              <option value="on_upload">On document upload</option>
              <option value="on_status">On status transition</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-ink">Description</label>
            <textarea
              v-model="form.description"
              rows="2"
              class="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
              placeholder="Purpose and business rules..."
            />
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
              Create template
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
