<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string | number | null | undefined
  options: Array<{ value: string | number; label: string }>
  placeholder?: string
  allowEmpty?: boolean
  disabled?: boolean
}>(), {
  placeholder: 'Select…',
  allowEmpty: true,
  disabled: false,
})

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <select
    :value="modelValue ?? ''"
    :disabled="disabled"
    class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-canvas"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option v-if="allowEmpty" value="">{{ placeholder }}</option>
    <option v-else value="" disabled>{{ placeholder }}</option>
    <option v-for="o in options" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
  </select>
</template>
