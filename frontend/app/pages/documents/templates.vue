<script setup lang="ts">
import { useDocuments, useDocumentsUnitId } from '../../features/documents/useDocuments'
import type { DmTemplate, DmTemplateField, DmRetentionPolicy } from '../../features/documents/document-types'

definePageMeta({ layout: 'admin-dm' })
useHead({ title: 'Metadata Templates' })

const api = useDocuments()
const unitId = useDocumentsUnitId()

const templates = ref<DmTemplate[]>([])
const retentionPolicies = ref<DmRetentionPolicy[]>([])
const loading = ref(false)
const error = ref('')

// Template modal
const modalOpen = ref(false)
const isEdit = ref(false)
const editingId = ref('')
const name = ref('')
const code = ref('')
const description = ref('')
const defaultPolicyId = ref('')
const fields = ref<DmTemplateField[]>([])
const saveLoading = ref(false)
const saveError = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [tList, rList] = await Promise.all([
      api.templates(),
      api.retentionPolicies().catch(() => []),
    ])
    templates.value = tList
    retentionPolicies.value = rList
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not load templates.'
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
  code.value = ''
  description.value = ''
  defaultPolicyId.value = ''
  fields.value = [
    { name: 'referenceNumber', label: 'Reference Number', type: 'string', required: true },
    { name: 'effectiveDate', label: 'Effective Date', type: 'date', required: false },
  ]
  saveError.value = ''
  modalOpen.value = true
}

function openEdit(tmpl: DmTemplate) {
  isEdit.value = true
  editingId.value = tmpl.id
  name.value = tmpl.name
  code.value = tmpl.code
  description.value = tmpl.description || ''
  defaultPolicyId.value = tmpl.defaultRetentionPolicyId || ''
  fields.value = JSON.parse(JSON.stringify(tmpl.schema || []))
  saveError.value = ''
  modalOpen.value = true
}

function addField() {
  fields.value.push({
    name: 'field_' + (fields.value.length + 1),
    label: 'Custom Field ' + (fields.value.length + 1),
    type: 'string',
    required: false,
  })
}

function removeField(index: number) {
  fields.value.splice(index, 1)
}

async function handleSave() {
  if (!name.value.trim() || !code.value.trim()) {
    saveError.value = 'Template name and code are required.'
    return
  }
  saveLoading.value = true
  saveError.value = ''

  try {
    if (isEdit.value) {
      await api.updateTemplate(editingId.value, {
        name: name.value.trim(),
        description: description.value.trim(),
        schema: fields.value,
        defaultRetentionPolicyId: defaultPolicyId.value || undefined,
      })
    } else {
      await api.createTemplate({
        name: name.value.trim(),
        code: code.value.trim(),
        description: description.value.trim(),
        schema: fields.value,
        defaultRetentionPolicyId: defaultPolicyId.value || undefined,
      })
    }
    modalOpen.value = false
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'Could not save template.'
  } finally {
    saveLoading.value = false
  }
}

async function handleDelete(tmpl: DmTemplate) {
  if (!confirm(`Delete template "${tmpl.name}"?`)) return
  try {
    await api.deleteTemplate(tmpl.id)
    await load()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Could not delete template.')
  }
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader
      title="Metadata Templates"
      subtitle="Define document types, category classification, and custom attribute schemas for structured records."
      icon="rectangle-stack"
    >
      <BaseButton variant="primary" @click="openCreate">
        <AppIcon name="plus" :size="16" class="mr-1" /> New template
      </BaseButton>
    </PageHeader>

    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

    <!-- Templates Grid -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="tmpl in templates"
        :key="tmpl.id"
        class="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-3"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase text-primary">
              {{ tmpl.code }}
            </span>
            <h3 class="mt-1.5 text-sm font-bold text-ink">{{ tmpl.name }}</h3>
          </div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="p-1 text-ink-faint hover:text-ink"
              title="Edit template"
              @click="openEdit(tmpl)"
            >
              <AppIcon name="pencil" :size="14" />
            </button>
            <button
              type="button"
              class="p-1 text-ink-faint hover:text-red-600"
              title="Delete template"
              @click="handleDelete(tmpl)"
            >
              <AppIcon name="trash" :size="14" />
            </button>
          </div>
        </div>

        <p class="text-xs text-ink-soft line-clamp-2">
          {{ tmpl.description || 'No description provided.' }}
        </p>

        <div class="border-t border-line/60 pt-2 text-xs text-ink-faint space-y-1">
          <div class="flex items-center justify-between">
            <span>Custom fields:</span>
            <strong class="text-ink">{{ tmpl.schema?.length || 0 }}</strong>
          </div>
          <div v-if="tmpl.retentionPolicyName" class="flex items-center justify-between">
            <span>Default policy:</span>
            <span class="text-ink font-medium">{{ tmpl.retentionPolicyName }}</span>
          </div>
        </div>
      </div>

      <div v-if="!templates.length" class="col-span-full rounded-xl border border-line bg-surface py-12 text-center text-xs text-ink-faint">
        No custom metadata templates defined yet. Click "New template" to define one.
      </div>
    </div>

    <!-- Template Create/Edit Modal -->
    <ModalShell
      :open="modalOpen"
      :title="isEdit ? 'Edit metadata template' : 'Create metadata template'"
      subtitle="Define document classification and custom fields"
      width="max-w-2xl"
      @close="modalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="handleSave">
        <div v-if="saveError" class="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {{ saveError }}
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Template name *" required>
            <TextInput v-model="name" placeholder="e.g. Supplier Contract" required />
          </FormField>
          <FormField label="Template code *" required>
            <TextInput v-model="code" placeholder="e.g. CONTRACT" :disabled="isEdit" required />
          </FormField>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Default retention policy">
            <select
              v-model="defaultPolicyId"
              class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink"
            >
              <option value="">None (Standard retention)</option>
              <option v-for="p in retentionPolicies" :key="p.id" :value="p.id">
                {{ p.name }} ({{ p.retentionDays }} days)
              </option>
            </select>
          </FormField>
          <FormField label="Description">
            <TextInput v-model="description" placeholder="Brief explanation of document type..." />
          </FormField>
        </div>

        <!-- Custom Field Schema Builder -->
        <div class="border-t border-line pt-3 space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold uppercase tracking-wider text-ink-faint">Custom metadata fields</h4>
            <BaseButton size="sm" variant="secondary" type="button" @click="addField">
              <AppIcon name="plus" :size="13" class="mr-1" /> Add field
            </BaseButton>
          </div>

          <div class="space-y-2 max-h-56 overflow-y-auto">
            <div
              v-for="(f, i) in fields"
              :key="i"
              class="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-canvas/40 p-2 text-xs"
            >
              <input
                v-model="f.name"
                type="text"
                placeholder="Field key"
                class="w-28 rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
                required
              />
              <input
                v-model="f.label"
                type="text"
                placeholder="Field label"
                class="flex-1 rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
                required
              />
              <select
                v-model="f.type"
                class="w-24 rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
              >
                <option value="string">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Boolean</option>
                <option value="select">Select</option>
              </select>
              <label class="flex items-center gap-1 text-[11px] text-ink-soft cursor-pointer">
                <input v-model="f.required" type="checkbox" class="rounded border-line text-primary" />
                Required
              </label>
              <button
                type="button"
                class="text-ink-faint hover:text-red-600 p-1"
                title="Remove field"
                @click="removeField(i)"
              >
                <AppIcon name="trash" :size="13" />
              </button>
            </div>
            <div v-if="!fields.length" class="py-4 text-center text-xs text-ink-faint">
              No custom fields added yet.
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="secondary" type="button" @click="modalOpen = false">
            Cancel
          </BaseButton>
          <BaseButton variant="primary" type="submit" :disabled="saveLoading">
            {{ saveLoading ? 'Saving...' : isEdit ? 'Update template' : 'Create template' }}
          </BaseButton>
        </div>
      </form>
    </ModalShell>
  </section>
</template>
