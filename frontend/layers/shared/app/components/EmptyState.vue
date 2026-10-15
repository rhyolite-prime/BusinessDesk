<script setup lang="ts">
withDefaults(defineProps<{ icon?: string; title: string; message?: string }>(), { icon: 'information-circle' })
</script>

<template>
  <div class="text-center py-12 px-6">
    <span class="inline-flex w-14 h-14 rounded-full bg-canvas text-ink-faint items-center justify-center mb-4">
      <AppIcon :name="icon" :size="26" />
    </span>
    <h3 class="text-sm font-semibold text-ink">{{ title }}</h3>
    <p v-if="message" class="text-xs text-ink-faint mt-1 max-w-sm mx-auto">{{ message }}</p>
    <div v-if="$slots.default" class="mt-4 flex justify-center">
      <slot />
    </div>
  </div>
</template>
