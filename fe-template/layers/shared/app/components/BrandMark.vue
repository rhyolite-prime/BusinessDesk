<script setup lang="ts">
const { brand } = useBrand()
const { initials } = useFormat()
withDefaults(defineProps<{ dark?: boolean }>(), { dark: false })
</script>

<template>
  <div class="flex items-center gap-3 min-w-0">
    <span
      class="w-10 h-10 rounded-xl bg-accent text-sidebar flex items-center justify-center text-sm shadow-md shrink-0"
      style="font-weight: 800"
    >
      {{ initials(brand.institutionShort) }}
    </span>
    <div class="min-w-0">
      <p class="text-[15px] font-bold leading-tight truncate" :class="dark ? 'text-white' : 'text-ink'">
        {{ brand.institutionName }}
      </p>
      <p class="text-[10px] uppercase tracking-[0.14em] truncate" :class="dark ? 'text-white/50' : 'text-ink-faint'">
        {{ brand.productName }}
      </p>
    </div>
  </div>
</template>
