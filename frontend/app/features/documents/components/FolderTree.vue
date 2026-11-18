<script setup lang="ts">
import type { DmFolder } from '../document-types'

const props = defineProps<{
  folders: DmFolder[]
  selectedFolderId?: string | null
}>()

const emit = defineEmits<{
  select: [folderId: string | null]
  create: [parentId: string | null]
  edit: [folder: DmFolder]
  delete: [folder: DmFolder]
}>()

const expanded = ref<Record<string, boolean>>({})

function toggleExpand(id: string) {
  expanded.value[id] = !expanded.value[id]
}

const rootFolders = computed(() => props.folders.filter((f) => !f.parentId))

function getChildren(parentId: string) {
  return props.folders.filter((f) => f.parentId === parentId)
}
</script>

<template>
  <div class="rounded-xl border border-line bg-surface p-3 text-sm shadow-sm">
    <div class="mb-2 flex items-center justify-between border-b border-line px-2 pb-2">
      <span class="text-xs font-bold uppercase tracking-wider text-ink-faint">Folders</span>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-soft/40"
        title="Create folder at root"
        @click="emit('create', null)"
      >
        <AppIcon name="plus" :size="14" /> New
      </button>
    </div>

    <!-- Root / All Documents selection -->
    <div
      class="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 transition"
      :class="selectedFolderId === null ? 'bg-primary-soft text-primary font-semibold' : 'text-ink hover:bg-canvas'"
      @click="emit('select', null)"
    >
      <div class="flex items-center gap-2">
        <AppIcon name="folder" :size="16" />
        <span>Root (All documents)</span>
      </div>
    </div>

    <!-- Recursive tree -->
    <div v-if="rootFolders.length" class="mt-1 space-y-0.5">
      <div v-for="folder in rootFolders" :key="folder.id">
        <div
          class="group flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 transition"
          :class="selectedFolderId === folder.id ? 'bg-primary-soft text-primary font-semibold' : 'text-ink hover:bg-canvas'"
          @click="emit('select', folder.id)"
        >
          <div class="flex min-w-0 items-center gap-1.5">
            <button
              v-if="getChildren(folder.id).length"
              type="button"
              class="text-ink-faint hover:text-ink"
              @click.stop="toggleExpand(folder.id)"
            >
              <AppIcon :name="expanded[folder.id] ? 'chevron-down' : 'chevron-right'" :size="14" />
            </button>
            <span v-else class="w-3.5" />
            <AppIcon name="folder" :size="16" class="shrink-0 text-amber-500" />
            <span class="truncate">{{ folder.name }}</span>
          </div>

          <div class="flex items-center gap-1">
            <span
              v-if="folder.documentCount"
              class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              {{ folder.documentCount }}
            </span>
            <div class="hidden items-center gap-1 group-hover:flex">
              <button
                type="button"
                class="p-0.5 text-ink-faint hover:text-primary"
                title="Add subfolder"
                @click.stop="emit('create', folder.id)"
              >
                <AppIcon name="plus" :size="13" />
              </button>
              <button
                type="button"
                class="p-0.5 text-ink-faint hover:text-ink"
                title="Edit folder"
                @click.stop="emit('edit', folder)"
              >
                <AppIcon name="pencil" :size="13" />
              </button>
              <button
                v-if="!folder.isSystem"
                type="button"
                class="p-0.5 text-ink-faint hover:text-red-600"
                title="Delete folder"
                @click.stop="emit('delete', folder)"
              >
                <AppIcon name="trash" :size="13" />
              </button>
            </div>
          </div>
        </div>

        <!-- Children -->
        <div v-if="expanded[folder.id]" class="ml-4 space-y-0.5 border-l border-line/60 pl-1">
          <div v-for="child in getChildren(folder.id)" :key="child.id">
            <div
              class="group flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 transition"
              :class="selectedFolderId === child.id ? 'bg-primary-soft text-primary font-semibold' : 'text-ink hover:bg-canvas'"
              @click="emit('select', child.id)"
            >
              <div class="flex min-w-0 items-center gap-1.5">
                <AppIcon name="folder" :size="15" class="shrink-0 text-amber-500" />
                <span class="truncate">{{ child.name }}</span>
              </div>
              <div class="flex items-center gap-1">
                <span
                  v-if="child.documentCount"
                  class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {{ child.documentCount }}
                </span>
                <div class="hidden items-center gap-1 group-hover:flex">
                  <button
                    type="button"
                    class="p-0.5 text-ink-faint hover:text-ink"
                    title="Edit folder"
                    @click.stop="emit('edit', child)"
                  >
                    <AppIcon name="pencil" :size="13" />
                  </button>
                  <button
                    v-if="!child.isSystem"
                    type="button"
                    class="p-0.5 text-ink-faint hover:text-red-600"
                    title="Delete folder"
                    @click.stop="emit('delete', child)"
                  >
                    <AppIcon name="trash" :size="13" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="py-3 text-center text-xs text-ink-faint">
      No subfolders yet
    </div>
  </div>
</template>
