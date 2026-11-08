<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; icon?: string }>()
</script>

<template>
  <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
    <div class="flex items-center gap-3">
      <span v-if="icon" class="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-sm">
        <AppIcon :name="icon" :size="22" />
      </span>
      <div>
        <h1 class="text-xl font-bold text-ink tracking-tight">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-ink-faint mt-0.5">{{ subtitle }}</p>
      </div>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <slot />
    </div>
  </div>
</template>
