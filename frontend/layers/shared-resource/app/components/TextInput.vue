<script setup lang="ts">
defineProps<{
  modelValue: string | number | null | undefined
  type?: string
  placeholder?: string
  disabled?: boolean
  min?: number | string
  max?: number | string
  step?: number | string
}>()
defineEmits<{ 'update:modelValue': [v: any] }>()
</script>

<template>
  <input
    :type="type ?? 'text'" :value="modelValue ?? ''" :placeholder="placeholder" :disabled="disabled"
    :min="min" :max="max" :step="step"
    class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint
           focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition
           disabled:bg-canvas disabled:cursor-not-allowed"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
