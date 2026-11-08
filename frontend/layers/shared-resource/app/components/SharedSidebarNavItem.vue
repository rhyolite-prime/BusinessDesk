<script setup lang="ts">
interface MenuItem {
  label: string
  to?: string
  icon: string
  comingSoon?: boolean
  children?: MenuItem[]
}

defineOptions({ name: 'SharedSidebarNavItem' })

const props = withDefaults(defineProps<{
  item: MenuItem
  workspaceName?: string
  level?: number
}>(), {
  workspaceName: 'ERP',
  level: 0,
})
const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const expanded = ref(false)

const hasChildren = computed(() => Boolean(props.item.children?.length))

function isCurrent(item: MenuItem): boolean {
  if (item.to && (route.path === item.to || route.path.startsWith(`${item.to}/`))) return true
  return item.children?.some(isCurrent) ?? false
}

const isActive = computed(() => isCurrent(props.item))
const submenuId = computed(() => `sidebar-submenu-${props.level}-${props.item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)
const indentationClass = computed(() => props.level === 0 ? 'px-3 py-2.5' : 'px-2.5 py-2')
const textSizeClass = computed(() => props.level === 0 ? 'text-sm' : 'text-[13px]')

watch(isActive, (active) => {
  if (active && hasChildren.value) expanded.value = true
}, { immediate: true })

function comingSoonTitle(label: string) {
  return `${label} is planned for a later ${props.workspaceName} phase`
}
</script>

<template>
  <div>
    <button
      v-if="hasChildren"
      type="button"
      class="flex w-full items-center gap-3 rounded-lg text-left font-medium transition-colors"
      :class="[indentationClass, textSizeClass, isActive ? 'bg-white/5 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white']"
      :aria-expanded="expanded"
      :aria-controls="submenuId"
      @click="expanded = !expanded"
    >
      <AppIcon :name="item.icon" :size="level === 0 ? 18 : 16" />
      <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
      <AppIcon name="chevron-down" :size="14" class="transition-transform" :class="expanded ? 'rotate-180' : ''" />
    </button>

    <NuxtLink
      v-else-if="item.to && !item.comingSoon"
      :to="item.to"
      class="flex items-center gap-3 rounded-lg font-medium transition-colors"
      :class="[indentationClass, textSizeClass, isActive ? 'nav-active' : 'text-white/70 hover:bg-white/5 hover:text-white']"
      :aria-current="isActive ? 'page' : undefined"
      @click="emit('navigate')"
    >
      <AppIcon :name="item.icon" :size="level === 0 ? 18 : 16" />
      <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
    </NuxtLink>

    <button
      v-else
      type="button"
      disabled
      :title="comingSoonTitle(item.label)"
      class="flex w-full cursor-not-allowed items-center gap-3 rounded-lg text-left font-medium text-white/30"
      :class="[indentationClass, textSizeClass]"
    >
      <AppIcon :name="item.icon" :size="level === 0 ? 18 : 16" />
      <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
      <span class="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/40">Soon</span>
    </button>

    <div v-if="hasChildren && expanded" :id="submenuId" role="group" class="ml-3 mt-1 space-y-0.5 border-l border-white/10 pl-1.5">
      <SharedSidebarNavItem
        v-for="child in item.children"
        :key="child.label"
        :item="child"
        :workspace-name="workspaceName"
        :level="level + 1"
        @navigate="emit('navigate')"
      />
    </div>
  </div>
</template>
