<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string
  value: string | number
  icon: string
  tone?: 'primary' | 'green' | 'amber' | 'red' | 'blue' | 'purple'
  hint?: string
  trend?: string
  trendUp?: boolean | null
}>(), { tone: 'primary', trendUp: null })

const toneCls: Record<string, string> = {
  primary: 'bg-primary-soft text-primary',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
}
</script>

<template>
  <BaseCard :pad="false">
    <div class="p-5 flex items-start gap-4">
      <span class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" :class="toneCls[props.tone]">
        <AppIcon :name="icon" :size="22" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium text-ink-faint uppercase tracking-wide">{{ label }}</p>
        <p class="text-xl font-bold text-ink tnum mt-1 truncate">{{ value }}</p>
        <div class="flex items-center gap-2 mt-1">
          <span v-if="trend" class="inline-flex items-center gap-1 text-[11px] font-medium"
            :class="trendUp === null ? 'text-ink-faint' : trendUp ? 'text-emerald-600' : 'text-red-600'">
            <AppIcon v-if="trendUp !== null" :name="trendUp ? 'arrow-trending-up' : 'arrow-trending-down'" :size="12" />
            {{ trend }}
          </span>
          <span v-if="hint" class="text-[11px] text-ink-faint">{{ hint }}</span>
        </div>
      </div>
    </div>
  </BaseCard>
</template>
