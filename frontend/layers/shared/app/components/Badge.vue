<script setup lang="ts">
import type { StatusTone } from '@shared/types/models'
const props = withDefaults(defineProps<{ tone?: StatusTone; dot?: boolean; size?: 'sm' | 'md' }>(), { tone: 'gray', dot: false, size: 'md' })

const tones: Record<StatusTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  gray: 'bg-slate-100 text-slate-600 ring-slate-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
}
const dotColors: Record<StatusTone, string> = {
  green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500',
  blue: 'bg-blue-500', gray: 'bg-slate-400', purple: 'bg-purple-500',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset font-medium whitespace-nowrap"
    :class="[tones[props.tone], size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs']"
  >
    <span v-if="dot" class="w-1.5 h-1.5 rounded-full" :class="dotColors[props.tone]" />
    <slot />
  </span>
</template>
