<script setup lang="ts" generic="T extends Record<string, any>">
export interface Column {
  key: string
  label: string
  sortable?: boolean
  class?: string
  align?: 'left' | 'right' | 'center'
}
const props = withDefaults(defineProps<{
  columns: Column[]
  rows: T[]
  loading?: boolean
  rowKey?: string
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  empty?: string
}>(), { rowKey: 'id', sortDir: 'asc', empty: 'No records found.' })

const emit = defineEmits<{
  'update:sortKey': [v: string]
  'update:sortDir': [v: 'asc' | 'desc']
  rowClick: [row: T]
}>()

function sortBy(col: Column) {
  if (!col.sortable) return
  if (props.sortKey === col.key) {
    emit('update:sortDir', props.sortDir === 'asc' ? 'desc' : 'asc')
  } else {
    emit('update:sortKey', col.key)
    emit('update:sortDir', 'asc')
  }
}

const sorted = computed(() => {
  if (!props.sortKey) return props.rows
  const k = props.sortKey
  const dir = props.sortDir === 'asc' ? 1 : -1
  return [...props.rows].sort((a, b) => {
    const av = a[k]; const bv = b[k]
  if (av == null) return 1
  if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })
})
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-line">
          <th v-for="col in columns" :key="col.key"
            class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint whitespace-nowrap select-none"
            :class="[col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '', col.sortable ? 'cursor-pointer hover:text-ink' : '']"
            @click="sortBy(col)">
            <span class="inline-flex items-center gap-1">
              {{ col.label }}
              <AppIcon v-if="col.sortable && sortKey === col.key"
                :name="sortDir === 'asc' ? 'chevron-down' : 'chevron-down'"
                :size="12" class="transition-transform" :class="sortDir === 'desc' ? 'rotate-180' : ''" />
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading" v-for="i in 6" :key="`sk${i}`" class="border-b border-line/60">
          <td v-for="col in columns" :key="col.key" class="px-4 py-3.5">
            <div class="h-3.5 rounded bg-canvas animate-pulse" :style="{ width: `${40 + (i * 13 + col.key.length * 7) % 50}%` }" />
          </td>
        </tr>
        <template v-else>
          <tr v-for="(row, i) in sorted" :key="row[rowKey] ?? i"
            class="border-b border-line/60 hover:bg-primary-soft/40 transition-colors group"
            :class="$slots.rowClick || true ? '' : ''"
            @click="$emit('rowClick', row)">
            <td v-for="col in columns" :key="col.key"
              class="px-4 py-3 text-ink-soft whitespace-nowrap"
              :class="[col.align === 'right' ? 'text-right tnum' : col.align === 'center' ? 'text-center' : '', col.class ?? '']">
              <slot name="cell" :col="col" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
          <tr v-if="!sorted.length">
            <td :colspan="columns.length" class="px-4 py-10 text-center text-sm text-ink-faint">
              <AppIcon name="information-circle" :size="20" class="mx-auto mb-2 text-ink-faint" />
              {{ empty }}
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
