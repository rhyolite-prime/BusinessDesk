<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md'
  icon?: string
  to?: string
  block?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}>(), { variant: 'primary', size: 'md', type: 'button' })

const cls = computed(() => [
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary/50',
  'disabled:opacity-50 disabled:pointer-events-none',
  props.size === 'sm' ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2.5',
  props.block ? 'w-full' : '',
  {
    primary: 'bg-primary text-on-primary hover:bg-primary-dark shadow-sm',
    secondary: 'bg-surface text-ink border border-line hover:bg-canvas',
    ghost: 'text-ink-soft hover:bg-canvas',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  }[props.variant],
])
</script>

<template>
  <NuxtLink v-if="to && !disabled" :to="to" :class="cls">
    <AppIcon v-if="icon" :name="icon" :size="size === 'sm' ? 15 : 17" />
    <slot />
  </NuxtLink>
  <button v-else :type="type" :disabled="disabled" :class="cls">
    <AppIcon v-if="icon" :name="icon" :size="size === 'sm' ? 15 : 17" />
    <slot />
  </button>
</template>
