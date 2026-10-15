<script setup lang="ts">
const props = withDefaults(defineProps<{ open: boolean; title: string; subtitle?: string; width?: string }>(), { width: 'max-w-lg' })
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) { if (e.key === 'Escape') emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
        <div class="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px]" @click="emit('close')" />
        <Transition name="pop" appear>
          <div v-if="open" class="relative w-full" :class="props.width">
            <div class="bg-surface rounded-2xl shadow-2xl border border-line my-8">
              <header class="flex items-start justify-between gap-4 px-6 py-4 border-b border-line">
                <div>
                  <h2 class="text-base font-semibold text-ink">{{ title }}</h2>
                  <p v-if="subtitle" class="text-xs text-ink-faint mt-0.5">{{ subtitle }}</p>
                </div>
                <button class="text-ink-faint hover:text-ink p-1 -m-1 rounded-md hover:bg-canvas" @click="emit('close')">
                  <AppIcon name="x-mark" :size="18" />
                </button>
              </header>
              <div class="px-6 py-5">
                <slot />
              </div>
              <footer v-if="$slots.footer" class="px-6 py-4 border-t border-line bg-canvas/60 rounded-b-2xl flex items-center justify-end gap-2">
                <slot name="footer" />
              </footer>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
