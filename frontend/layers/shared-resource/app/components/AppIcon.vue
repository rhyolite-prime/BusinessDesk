<script setup lang="ts">
import { ICON_PATHS } from '../utils/icons'

const props = withDefaults(defineProps<{ name: string; size?: number | string }>(), { size: 20 })
const paths = computed(() => ICON_PATHS[props.name] ?? [])
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
  >
    <path v-for="(path, index) in paths" :key="index" :d="path" />
  </svg>
</template>
