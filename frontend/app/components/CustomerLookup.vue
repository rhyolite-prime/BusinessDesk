<script setup lang="ts">
interface Option {
  id: string
  label: string
  unitId?: string
}
const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    kind: 'groups' | 'currencies' | 'accounts' | 'receivables'
    selectedLabel?: string
    unitId?: string
    disabled?: boolean
    required?: boolean
  }>(),
  { selectedLabel: '', unitId: '', disabled: false, required: true },
)
const emit = defineEmits<{
  'update:modelValue': [value: string]
  selected: [option: Option]
}>()
const request = useRequestFetch(),
  options = ref<Option[]>([]),
  page = ref(1),
  pages = ref(0),
  loading = ref(false),
  error = ref('')
const isGl = computed(() => props.kind === 'accounts' || props.kind === 'receivables')
const glOptions = computed(() => options.value.map(option => ({ ...option, type: 'GL accounts' })))
const inputId = useId(),
  initialId = props.modelValue,
  cache = ref<Record<string, Option>>({})
function choose(value: string) {
  const option = (isGl.value ? options.value : visible.value).find((o) => o.id === value)
  if (isGl.value && !option && (value !== '' || props.required)) return
  if (option) {
    cache.value[value] = option
    emit('selected', option)
  }
  emit('update:modelValue', value)
}
function paginate(step: number) {
  page.value += step
  void load()
}
let generation = 0
const visible = computed(() =>
  props.modelValue && !options.value.some((o) => o.id === props.modelValue)
    ? [
        cache.value[props.modelValue] || {
          id: props.modelValue,
          label:
            props.modelValue === initialId && props.selectedLabel
              ? props.selectedLabel
              : 'Selected record — refresh or reselect',
        },
        ...options.value,
      ]
    : options.value,
)
async function load(reset = false) {
  if (reset) page.value = 1
  const current = ++generation
  loading.value = true
  error.value = ''
  try {
    const kind = props.kind, accountingUnitId = props.unitId
    const rows: Option[] = []
    let totalPages = 0
    for (let pageNo = isGl.value ? 1 : page.value; ; pageNo++) {
      if (current !== generation) return
      if (isGl.value && pageNo > 1000) throw new Error('Too many GL accounts. Please contact your administrator.')
      const r = await request<{ data: Option[]; totalPages: number }>(
        '/api/shared/customers/options',
        { query: { kind, accountingUnitId, pageNo, pageSize: isGl.value ? 100 : 20 } },
      )
      if (current !== generation) return
      rows.push(...r.data); totalPages = r.totalPages
      if (!isGl.value || !r.data.length || pageNo >= r.totalPages) break
    }
    options.value = rows
    pages.value = totalPages
  } catch (e: any) {
    if (current === generation) {
      options.value = []
      error.value = e?.data?.statusMessage || e?.message || 'Unable to load choices.'
    }
  } finally {
    if (current === generation) loading.value = false
  }
}
watch(
  () => [props.unitId, props.kind],
  () => {
    options.value = []
    cache.value = {}
    void load(true)
  },
)
onMounted(() => load(true))
onUnmounted(() => {
  generation++
})
</script>
<template>
  <div class="space-y-1.5">
    <AccountControlPicker
      v-if="isGl"
      kind="accounts"
      :label="label + (required ? ' *' : '')"
      :empty-label="required ? undefined : 'Not configured'"
      :model-value="modelValue"
      :options="glOptions"
      :unavailable-text="cache[modelValue]?.label || selectedLabel || 'Unavailable account (replace)'"
      :disabled="disabled || loading"
      @update:model-value="choose"
    />
    <template v-else>
    <label
      :for="inputId"
      class="block text-xs font-semibold text-slate-600 dark:text-slate-300"
      >{{ label }} {{ required ? '*' : '' }}</label
    >
    <select
      :id="inputId"
      :aria-label="label"
      :value="modelValue"
      :required="required"
      :disabled="disabled || loading"
      class="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-[#172321]"
      @change="choose(($event.target as HTMLSelectElement).value)"
    >
      <option value="">{{ loading ? 'Loading…' : 'Select an option' }}</option>
      <option v-for="o in visible" :key="o.id" :value="o.id">
        {{ o.label }}
      </option>
    </select>
    <div v-if="pages > 1" class="flex items-center gap-1">
      <button
        type="button"
        :disabled="disabled || loading || page <= 1"
        aria-label="Previous choices"
        class="px-1 text-xs disabled:opacity-30"
        @click="paginate(-1)"
      >
        ‹</button
      ><span class="text-[10px] text-slate-400"
        >{{ page }}/{{ Math.max(pages, 1) }}</span
      ><button
        type="button"
        :disabled="disabled || loading || page >= pages"
        aria-label="Next choices"
        class="px-1 text-xs disabled:opacity-30"
        @click="paginate(1)"
      >
        ›
      </button>
    </div>
    </template>
    <p v-if="error" role="alert" class="text-xs text-rose-600">{{ error }} <button v-if="isGl" type="button" class="underline" :disabled="loading" @click="load(true)">Retry</button></p>
  </div>
</template>
