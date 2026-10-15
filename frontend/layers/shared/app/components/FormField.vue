<script setup lang="ts">
defineProps<{ label: string; hint?: string; required?: boolean }>()
</script>

<template>
  <label class="block">
    <span class="text-xs font-semibold text-ink-soft">
      {{ label }}<span v-if="required" class="text-red-500"> *</span>
    </span>
    <div class="mt-1.5">
      <slot />
    </div>
    <span v-if="hint" class="text-[11px] text-ink-faint mt-1 block">{{ hint }}</span>
  </label>
</template>
