<script setup lang="ts">
const { toasts, dismiss } = useToast()
const toneCls = {
  success: { bar: 'bg-emerald-500', icon: 'check-circle' },
  error: { bar: 'bg-red-500', icon: 'x-circle' },
  info: { bar: 'bg-blue-500', icon: 'information-circle' },
} as const
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[min(92vw,380px)]">
      <TransitionGroup name="pop">
        <div v-for="t in toasts" :key="t.id"
          class="bg-surface rounded-xl shadow-xl border border-line overflow-hidden flex items-stretch">
          <span class="w-1.5" :class="toneCls[t.tone].bar" />
          <div class="flex items-start gap-3 p-3.5 flex-1">
            <AppIcon :name="toneCls[t.tone].icon" :size="20"
              :class="t.tone === 'success' ? 'text-emerald-500' : t.tone === 'error' ? 'text-red-500' : 'text-blue-500'" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-ink">{{ t.title }}</p>
              <p v-if="t.message" class="text-xs text-ink-faint mt-0.5 break-words">{{ t.message }}</p>
            </div>
            <button class="text-ink-faint hover:text-ink" @click="dismiss(t.id)">
              <AppIcon name="x-mark" :size="15" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
