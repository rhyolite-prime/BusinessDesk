<script setup lang="ts">
withDefaults(defineProps<{ title?: string; subtitle?: string; icon?: string; pad?: boolean }>(), { pad: true })
</script>

<template>
  <section class="bg-surface rounded-xl border border-line shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <header v-if="title || $slots.actions || $slots.header" class="flex items-start justify-between gap-4 px-5 py-4 border-b border-line">
      <div class="flex items-center gap-3 min-w-0">
        <span v-if="icon" class="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
          <AppIcon :name="icon" :size="18" />
        </span>
        <div class="min-w-0">
          <h3 class="text-sm font-semibold text-ink truncate">{{ title }}</h3>
          <p v-if="subtitle" class="text-xs text-ink-faint mt-0.5">{{ subtitle }}</p>
        </div>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
        <slot name="actions" />
      </div>
      <slot name="header" />
    </header>
    <div :class="pad ? 'p-5' : ''">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="px-5 py-3 border-t border-line rounded-b-xl bg-canvas/50">
      <slot name="footer" />
    </footer>
  </section>
</template>
