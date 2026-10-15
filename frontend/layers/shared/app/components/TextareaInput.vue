<script setup lang="ts">
defineProps<{ modelValue: string; placeholder?: string; rows?: number }>()
defineEmits<{ 'update:modelValue': [v: string] }>()
</script>

<template>
  <textarea
    :value="modelValue" :placeholder="placeholder" :rows="rows ?? 3"
    class="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint
           focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-y"
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
