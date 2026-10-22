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
    kind: 'groups' | 'currencies' | 'accounts' | 'credits'
    selectedLabel?: string
    unitId?: string
    disabled?: boolean
  }>(),
  { selectedLabel: '', unitId: '', disabled: false },
)
const emit = defineEmits<{
  'update:modelValue': [value: string]
  selected: [option: Option]
}>()
const request = useRequestFetch(),
  options = ref<Option[]>([]),
  search = ref(''),
  page = ref(1),
  pages = ref(0),
  loading = ref(false),
  error = ref('')
const inputId = useId(),
  initialId = props.modelValue,
  cache = ref<Record<string, Option>>({})
function choose(value: string) {
  const option = visible.value.find((o) => o.id === value)
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
    const r = await request<{ data: Option[]; totalPages: number }>(
      '/api/shared/suppliers/options',
      {
        query: {
          kind: props.kind,
          accountingUnitId: props.unitId,
          query: search.value,
          pageNo: page.value,
          pageSize: 20,
        },
      },
    )
    if (current === generation) {
      options.value = r.data
      pages.value = r.totalPages
    }
  } catch (e: any) {
    if (current === generation) {
      options.value = []
      error.value = e?.data?.statusMessage || 'Unable to load choices.'
    }
  } finally {
    if (current === generation) loading.value = false
  }
}
watch(
  () => props.unitId,
  () => {
    options.value = []
    search.value = ''
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
    <label
      :for="inputId"
      class="block text-xs font-semibold text-slate-600 dark:text-slate-300"
      >{{ label }} *</label
    >
    <select
      :id="inputId"
      :aria-label="label"
      :value="modelValue"
      required
      :disabled="disabled || loading"
      class="h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-[#172321]"
      @change="choose(($event.target as HTMLSelectElement).value)"
    >
      <option value="">{{ loading ? 'Loading…' : 'Select an option' }}</option>
      <option v-for="o in visible" :key="o.id" :value="o.id">
        {{ o.label }}
      </option>
    </select>
    <div class="flex items-center gap-1">
      <input
        v-model="search"
        :aria-label="`Search ${label}`"
        :disabled="disabled || loading"
        maxlength="200"
        placeholder="Search choices…"
        class="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700"
        @keydown.enter.prevent="load(true)"
      /><button
        type="button"
        :disabled="disabled || loading"
        class="rounded px-2 py-1 text-[11px] font-semibold text-brand-700 disabled:opacity-40 dark:text-brand-300"
        @click="load(true)"
      >
        Find</button
      ><button
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
    <p v-if="error" role="alert" class="text-xs text-rose-600">{{ error }}</p>
  </div>
</template>
