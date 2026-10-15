<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  tone?: 'primary' | 'danger'
  icon?: string
  loading?: boolean
}>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <ModalShell :open="open" :title="title" width="max-w-md" @close="emit('cancel')">
    <div class="flex gap-4">
      <span class="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
        :class="props.tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-primary-soft text-primary'">
        <AppIcon :name="props.icon ?? 'exclamation-triangle'" :size="22" />
      </span>
      <p class="text-sm text-ink-soft leading-relaxed pt-2">{{ message }}</p>
    </div>
    <template #footer>
      <BaseButton variant="secondary" size="sm" @click="emit('cancel')">Cancel</BaseButton>
      <BaseButton :variant="props.tone === 'danger' ? 'danger' : 'primary'" size="sm"
        :disabled="props.loading" @click="emit('confirm')">
        {{ props.loading ? 'Working…' : (props.confirmLabel ?? 'Confirm') }}
      </BaseButton>
    </template>
  </ModalShell>
</template>
