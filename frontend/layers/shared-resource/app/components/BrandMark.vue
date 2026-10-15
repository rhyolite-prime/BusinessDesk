<script setup lang="ts">
withDefaults(defineProps<{ dark?: boolean; productName?: string }>(), {
  dark: false,
  productName: 'Finance workspace',
})
</script>

<template>
  <div class="flex min-w-0 items-center gap-3">
    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-extrabold text-sidebar shadow-md">
      BD
    </span>
    <span class="min-w-0">
      <span class="block truncate text-[15px] font-bold leading-tight" :class="dark ? 'text-white' : 'text-ink'">BusinessDesk</span>
      <span class="mt-0.5 block truncate text-[10px] uppercase tracking-[0.14em]" :class="dark ? 'text-white/50' : 'text-ink-faint'">{{ productName }}</span>
    </span>
  </div>
</template>
