<script setup lang="ts">
const { sections } = useNavigation()
const { brand } = useBrand()
const route = useRoute()
const mobileOpen = useState('tl-sidebar-mobile', () => false)

const isActive = (to: string) =>
  to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(to + '/')
</script>

<template>
  <!-- Mobile overlay -->
  <Transition name="fade">
    <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" @click="mobileOpen = false" />
  </Transition>

  <aside
    class="fixed z-40 inset-y-0 left-0 w-[264px] flex flex-col bg-sidebar text-white/70 transition-transform duration-200 lg:translate-x-0"
    :class="mobileOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="px-5 py-5 border-b border-white/10">
      <BrandMark dark />
    </div>

    <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-5">
      <NuxtLink to="/modules"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
        :class="route.path === '/modules' ? 'nav-active' : 'hover:bg-white/5 hover:text-white'"
        @click="mobileOpen = false">
        <AppIcon name="home" :size="18" />
        Module manager
      </NuxtLink>

      <div v-for="section in sections" :key="section.key">
        <p class="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
          {{ section.label }}
        </p>
        <div class="space-y-0.5">
          <NuxtLink v-for="item in section.items" :key="item.to" :to="item.to"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="isActive(item.to) ? 'nav-active' : 'hover:bg-white/5 hover:text-white'"
            @click="mobileOpen = false">
            <AppIcon :name="item.icon" :size="18" />
            <span class="truncate">{{ item.label }}</span>
            <span v-if="item.badge" class="ml-auto text-[10px] font-bold bg-accent text-sidebar rounded-full px-1.5 py-0.5">
              {{ item.badge }}
            </span>
          </NuxtLink>
        </div>
      </div>
    </nav>

    <div class="px-5 py-4 border-t border-white/10 text-[10px] text-white/40 leading-relaxed">
      <p class="font-semibold text-white/60">{{ brand.productName }}</p>
      <p>BusinessDesk ERP · Finance, operations &amp; people</p>
    </div>
  </aside>
</template>
