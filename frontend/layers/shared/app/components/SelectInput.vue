<script setup lang="ts">
defineProps<{
  modelValue: string | number | null | undefined
  options: { value: string | number; label: string }[]
  placeholder?: string
  disabled?: boolean
}>()
defineEmits<{ 'update:modelValue': [v: any] }>()
</script>

<template>
  <select
    :value="modelValue ?? ''" :disabled="disabled"
    class="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink
           focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition
           disabled:bg-canvas disabled:cursor-not-allowed"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option value="" disabled>{{ placeholder ?? 'Select…' }}</option>
    <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
  </select>
</template>
