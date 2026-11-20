<script setup lang="ts">
import { useDocuments, useDocumentsUnitId } from '../../features/documents/useDocuments'
import type { DmRetentionPolicy } from '../../features/documents/document-types'

definePageMeta({ layout: 'admin-dm' })
useHead({ title: 'Retention & Compliance' })

const api = useDocuments()
const unitId = useDocumentsUnitId()

const policies = ref<DmRetentionPolicy[]>([])
const loading = ref(false)
const error = ref('')

const modalOpen = ref(false)
const isEdit = ref(false)
const editingId = ref('')
const name = ref('')
const description = ref('')
const retentionDays = ref(365)
const dispositionAction = ref<'archive' | 'review' | 'dispose'>('archive')
const saveLoading = ref(false)
const saveError = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    policies.value = await api.retentionPolicies()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not load retention policies.'
  } finally {
    loading.value = false
  }
}

watch(unitId, load)
onMounted(load)

function openCreate() {
  isEdit.value = false
  editingId.value = ''
  name.value = ''
  description.value = ''
  retentionDays.value = 365
  dispositionAction.value = 'archive'
  saveError.value = ''
  modalOpen.value = true
}

function openEdit(p: DmRetentionPolicy) {
  isEdit.value = true
  editingId.value = p.id
  name.value = p.name
  description.value = p.description || ''
  retentionDays.value = p.retentionDays
  dispositionAction.value = p.dispositionAction
  saveError.value = ''
  modalOpen.value = true
}

async function handleSave() {
  if (!name.value.trim()) {
    saveError.value = 'Policy name is required.'
    return
  }
  saveLoading.value = true
  saveError.value = ''

  try {
    if (isEdit.value) {
      await api.updateRetentionPolicy(editingId.value, {
        name: name.value.trim(),
        description: description.value.trim(),
        retentionDays: retentionDays.value,
        dispositionAction: dispositionAction.value,
      })
    } else {
      await api.createRetentionPolicy({
        name: name.value.trim(),
        description: description.value.trim(),
        retentionDays: retentionDays.value,
        dispositionAction: dispositionAction.value,
      })
    }
    modalOpen.value = false
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Could not save policy.'
  } finally {
    saveLoading.value = false
  }
}

async function handleDelete(p: DmRetentionPolicy) {
  if (!confirm(`Delete retention policy "${p.name}"?`)) return
  try {
    await api.deleteRetentionPolicy(p.id)
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not delete policy.')
  }
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader
      title="Retention & Compliance Policies"
      subtitle="Define statutory retention rules, compliance schedules, and document disposition lifecycles."
      icon="shield-check"
    >
      <BaseButton variant="primary" @click="openCreate">
        <AppIcon name="plus" :size="16" class="mr-1" /> New policy
      </BaseButton>
    </PageHeader>

    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

    <!-- Policies Table -->
    <div class="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
      <table class="w-full text-left text-xs">
        <thead class="border-b border-line bg-canvas/40 text-ink-faint">
          <tr>
            <th class="px-3 py-2.5">Policy name</th>
            <th class="px-3 py-2.5">Description</th>
            <th class="px-3 py-2.5">Retention period</th>
            <th class="px-3 py-2.5">Disposition action</th>
            <th class="px-3 py-2.5">Status</th>
            <th class="px-3 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="p in policies" :key="p.id" class="hover:bg-canvas/20">
            <td class="px-3 py-2 font-bold text-ink">
              {{ p.name }}
            </td>
            <td class="px-3 py-2 text-ink-soft">
              {{ p.description || '—' }}
            </td>
            <td class="px-3 py-2 font-medium text-ink">
              {{ p.retentionDays }} days (~{{ Math.round(p.retentionDays / 365 * 10) / 10 }} yrs)
            </td>
            <td class="px-3 py-2">
              <span class="rounded bg-primary-soft px-1.5 py-0.5 font-bold uppercase text-[10px] text-primary">
                {{ p.dispositionAction }}
              </span>
            </td>
            <td class="px-3 py-2">
              <Badge :variant="p.isActive ? 'success' : 'neutral'">
                {{ p.isActive ? 'Active' : 'Inactive' }}
              </Badge>
            </td>
            <td class="px-3 py-2 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  class="rounded p-1 text-ink-faint hover:bg-canvas hover:text-ink"
                  title="Edit policy"
                  @click="openEdit(p)"
                >
                  <AppIcon name="pencil" :size="14" />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-ink-faint hover:bg-canvas hover:text-red-600"
                  title="Delete policy"
                  @click="handleDelete(p)"
                >
                  <AppIcon name="trash" :size="14" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!policies.length">
            <td colspan="6" class="py-12 text-center text-ink-faint">
              No retention policies configured yet. Click "New policy" to add one.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Policy Modal -->
    <ModalShell
      :open="modalOpen"
      :title="isEdit ? 'Edit retention policy' : 'Create retention policy'"
      subtitle="Statutory retention rules and automatic expiration schedule"
      width="max-w-md"
      @close="modalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="handleSave">
        <div v-if="saveError" class="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {{ saveError }}
        </div>
        <FormField label="Policy name *" required>
          <TextInput v-model="name" placeholder="e.g. Financial Audit Records (7 Years)" required />
        </FormField>
        <div class="grid grid-cols-2 gap-3">
          <FormField label="Retention period (days) *" required>
            <TextInput v-model="retentionDays" type="number" required />
          </FormField>
          <FormField label="Disposition action">
            <select
              v-model="dispositionAction"
              class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink"
            >
              <option value="archive">Archive</option>
              <option value="review">Review</option>
              <option value="dispose">Dispose</option>
            </select>
          </FormField>
        </div>
        <FormField label="Description">
          <TextareaInput v-model="description" placeholder="Compliance citation or retention rationale..." :rows="2" />
        </FormField>
        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="secondary" type="button" @click="modalOpen = false">
            Cancel
          </BaseButton>
          <BaseButton variant="primary" type="submit" :disabled="saveLoading">
            {{ saveLoading ? 'Saving...' : isEdit ? 'Update policy' : 'Create policy' }}
          </BaseButton>
        </div>
      </form>
    </ModalShell>
  </section>
</template>
