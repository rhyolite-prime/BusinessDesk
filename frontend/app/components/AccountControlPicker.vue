<script setup lang="ts">
import { Check, ChevronDown, Search } from '@lucide/vue'
interface ControlOption { id: string; label: string; type: string; groupKey?: string; min?: number; max?: number }
const props = defineProps<{ modelValue: string; options: ControlOption[]; disabled?: boolean; kind?: 'controls' | 'heads' | 'parents' | 'cost-centers'; label?: string; unavailableText?: string }>()
const copy = computed(() => props.kind === 'cost-centers' ? {
  label: 'Cost center', plural: 'cost centers', search: 'Search cost centers',
  placeholder: 'Not configured', unavailable: 'Unavailable cost center (replace)',
  hint: 'Search name or hierarchy…', empty: 'No matching cost centers.',
} : props.kind === 'parents' ? {
  label: 'Parent head', plural: 'parent heads', search: 'Search parent heads',
  placeholder: 'Top level (no parent)', unavailable: 'Current parent is inactive/unavailable — select another',
  hint: 'Search name, hierarchy or type…', empty: 'No matching parent heads.',
} : props.kind === 'heads' ? {
  label: 'Chart of account', plural: 'chart heads', search: 'Search chart heads',
  placeholder: 'Select active chart head', unavailable: 'Current head is inactive/unavailable — select another',
  hint: 'Search name, hierarchy or type…', empty: 'No matching chart heads.',
} : {
  label: 'Account control', plural: 'controls', search: 'Search account controls',
  placeholder: 'Select active leaf control', unavailable: 'Current control is inactive/unavailable — select another',
  hint: 'Search name, hierarchy, type or range…', empty: 'No matching account controls.',
})
const optionLabel = (option: ControlOption) => option.min !== undefined && option.max !== undefined
  ? `${option.label} (${option.min}–${option.max})` : option.label
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId(), root = ref<HTMLElement | null>(null), trigger = ref<HTMLButtonElement | null>(null), searchInput = ref<HTMLInputElement | null>(null)
const open = ref(false), query = ref(''), active = ref(-1)
const fieldLabel = computed(() => props.label || copy.value.label)
const optionGroupKey = (option: ControlOption) => props.kind === 'cost-centers' ? option.groupKey || option.type : option.type
const groupDefinitions = computed(() => {
  if (props.kind !== 'cost-centers') return ['Unknown', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(type => ({ key: type, type }))
  const definitions = new Map(props.options.map(option => [optionGroupKey(option), { key: optionGroupKey(option), type: option.type }]))
  return [...definitions.values()].sort((a, b) => a.key === 'root' ? b.key === 'root' ? 0 : -1 : b.key === 'root' ? 1 : a.type.localeCompare(b.type) || a.key.localeCompare(b.key))
})
const selected = computed(() => props.options.find(option => option.id === props.modelValue))
const ordered = computed(() => [...props.options].sort((a, b) => groupDefinitions.value.findIndex(group => group.key === optionGroupKey(a)) - groupDefinitions.value.findIndex(group => group.key === optionGroupKey(b)) || (a.min ?? 0) - (b.min ?? 0) || (a.max ?? 0) - (b.max ?? 0) || a.label.localeCompare(b.label)))
const filtered = computed(() => {
  const terms = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return ordered.value.filter(option => terms.every(term => `${option.type} ${option.label} ${option.min ?? ''} ${option.max ?? ''}`.toLowerCase().includes(term)))
})
const groups = computed(() => groupDefinitions.value.map(group => ({ ...group, options: filtered.value.filter(option => optionGroupKey(option) === group.key) })).filter(group => group.options.length))
const title = (option: ControlOption) => option.label.split(' / ').at(-1)
const hierarchy = (option: ControlOption) => option.label.split(' / ').slice(0, -1).join(' / ')
async function expand() {
  if (props.disabled) return
  open.value = true; query.value = ''
  active.value = Math.max(0, filtered.value.findIndex(option => option.id === props.modelValue))
  await nextTick(); searchInput.value?.focus(); scrollActive()
}
function close() { open.value = false; trigger.value?.focus() }
function chooseTopLevel() { emit('update:modelValue', ''); close() }
function choose(option: ControlOption) { emit('update:modelValue', option.id); close() }
function scrollActive() { root.value?.querySelector(`[data-index="${active.value}"]`)?.scrollIntoView({ block: 'nearest' }) }
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
  if (event.key === 'Tab') open.value = false
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = Math.max(0, Math.min(filtered.value.length - 1, active.value + (event.key === 'ArrowDown' ? 1 : -1)))
    void nextTick(scrollActive)
  }
  if (event.key === 'Enter') { event.preventDefault(); const option = filtered.value[active.value]; if (option) choose(option) }
}
function outside(event: PointerEvent) { if (!root.value?.contains(event.target as Node)) open.value = false }
watch(query, () => { active.value = 0 })
watch(() => props.disabled, disabled => { if (disabled) open.value = false })
onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
</script>

<template>
  <div ref="root" @focusout="event => { if (!root?.contains(event.relatedTarget as Node)) open = false }">
    <span :id="`${id}-label`" class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">{{ fieldLabel }}</span>
    <button ref="trigger" type="button" :disabled="disabled" :aria-labelledby="`${id}-label ${id}-value`" aria-haspopup="listbox" :aria-expanded="open" :aria-controls="`${id}-list`"
      class="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900" @click="open ? close() : expand()" @keydown.down.prevent="expand">
      <span :id="`${id}-value`" class="min-w-0 break-words">{{ selected ? optionLabel(selected) : modelValue ? unavailableText || copy.unavailable : copy.placeholder }}</span><ChevronDown :size="16" class="shrink-0 text-slate-400" />
    </button>
    <div v-if="open" class="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <button v-if="kind === 'parents' || kind === 'cost-centers'" type="button" class="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-3 text-left text-sm font-medium hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 dark:border-slate-800 dark:hover:bg-slate-800" @click="chooseTopLevel">
        <Check :size="15" class="shrink-0 text-brand-600" :class="modelValue ? 'invisible' : ''" /> {{ kind === 'cost-centers' ? 'Not configured' : 'Top level (no parent)' }}
      </button>
      <div class="relative border-b border-slate-100 p-2 dark:border-slate-800">
        <Search :size="15" class="pointer-events-none absolute left-5 top-5 text-slate-400" />
        <input ref="searchInput" v-model="query" type="search" role="combobox" :aria-label="copy.search" aria-autocomplete="list" :aria-expanded="open" :aria-controls="`${id}-list`" :aria-activedescendant="filtered[active] ? `${id}-option-${active}` : undefined" :placeholder="copy.hint" class="h-10 w-full rounded-lg bg-slate-50 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-800" @keydown="keydown" />
      </div>
      <div :id="`${id}-list`" role="listbox" :aria-label="kind === 'cost-centers' ? 'Cost centers' : kind === 'parents' ? 'Parent heads' : kind === 'heads' ? 'Chart heads' : 'Account controls'" class="max-h-64 overflow-y-auto overscroll-contain">
        <div v-for="group in groups" :key="group.key" role="group" :aria-label="group.type">
          <div class="sticky top-0 z-10 flex justify-between bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300"><span>{{ group.type }}</span><span>{{ group.options.length }}</span></div>
          <div v-for="option in group.options" :id="`${id}-option-${filtered.indexOf(option)}`" :key="option.id" role="option" :aria-selected="modelValue === option.id" :data-index="filtered.indexOf(option)"
            class="flex cursor-pointer items-start gap-2 border-b border-slate-100 px-3 py-2.5 last:border-0 dark:border-slate-800" :class="active === filtered.indexOf(option) ? 'bg-brand-50 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'" @pointerdown.prevent @click="choose(option)" @pointermove="active = filtered.indexOf(option)">
            <Check :size="15" class="mt-0.5 shrink-0 text-brand-600" :class="modelValue === option.id ? '' : 'invisible'" />
            <div class="min-w-0 flex-1"><span class="block break-words text-sm font-medium">{{ title(option) }}</span><span v-if="hierarchy(option)" class="mt-0.5 block break-words text-[11px] text-slate-500 dark:text-slate-400">{{ hierarchy(option) }}</span></div>
            <span v-if="option.min !== undefined && option.max !== undefined" class="shrink-0 rounded bg-slate-100 px-1.5 py-1 text-[10px] tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-200">{{ option.min }}–{{ option.max }}</span>
          </div>
        </div>
        <p v-if="!filtered.length" role="status" class="p-5 text-center text-sm text-slate-500">{{ copy.empty }}</p>
      </div>
      <p class="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800">{{ filtered.length }} of {{ options.length }} {{ copy.plural }} · ↑ ↓ to navigate · Enter to select</p>
    </div>
  </div>
</template>
