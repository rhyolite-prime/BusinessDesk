<script setup lang="ts">
const props = defineProps<{ modelValue: string; disabled?: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  pending: [value: boolean]
}>()
const error = ref(''),
  loading = ref(false),
  input = ref<HTMLInputElement>()
let generation = 0
function reset() {
  generation++
  error.value = ''
  loading.value = false
  emit('pending', false)
  if (input.value) input.value.value = ''
}
watch(() => props.modelValue, reset)
watch(
  () => props.disabled,
  (value) => {
    if (value) reset()
  },
)
onUnmounted(() => {
  generation++
})
async function select(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || props.disabled || loading.value) return
  const current = ++generation
  error.value = ''
  if (
    !['image/png', 'image/jpeg'].includes(file.type) ||
    !file.size ||
    file.size > 256 * 1024
  ) {
    error.value = 'Choose a PNG or JPEG image no larger than 256 KB.'
    if (input.value) input.value.value = ''
    return
  }
  loading.value = true
  emit('pending', true)
  try {
    const value = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Unable to read image.'))
      reader.readAsDataURL(file)
    })
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () =>
        reject(new Error('This file is not a readable image.'))
      image.src = value
    })
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth > 4096 ||
      image.naturalHeight > 4096
    )
      throw new Error('Choose an image no larger than 4096 × 4096 pixels.')
    if (current === generation && !props.disabled)
      emit('update:modelValue', value)
  } catch (e) {
    if (current === generation)
      error.value = e instanceof Error ? e.message : 'Unable to load image.'
  } finally {
    if (current === generation) {
      loading.value = false
      emit('pending', false)
      if (input.value) input.value.value = ''
    }
  }
}
</script>
<template>
  <div class="sm:col-span-2">
    <label
      class="block text-xs font-semibold text-slate-600 dark:text-slate-300"
      >Company logo
      <input
        ref="input"
        type="file"
        accept="image/png,image/jpeg"
        :disabled="disabled || loading"
        class="mt-2 block w-full rounded-lg border border-slate-200 p-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700 disabled:opacity-50 dark:border-slate-700"
        @change="select"
      />
    </label>
    <p class="mt-1 text-[11px] text-slate-400">
      PNG or JPEG, up to 256 KB and 4096 × 4096 pixels. Save the profile to
      upload your selection.
    </p>
    <div v-if="modelValue" class="mt-3 flex items-center gap-4">
      <img
        :src="modelValue"
        alt="Company logo preview"
        referrerpolicy="no-referrer"
        class="h-24 w-40 rounded-lg border border-slate-200 bg-white object-contain p-2 dark:border-slate-700"
      />
      <button
        v-if="!disabled"
        type="button"
        :disabled="loading"
        class="text-xs font-semibold text-rose-600"
        @click="emit('update:modelValue', '')"
      >
        Remove logo
      </button>
    </div>
    <p v-if="loading" role="status" class="mt-2 text-xs text-slate-500">
      Preparing image…
    </p>
    <p v-if="error" role="alert" class="mt-2 text-xs text-rose-600">
      {{ error }}
    </p>
  </div>
</template>
