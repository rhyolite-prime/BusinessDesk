<script setup lang="ts">
const mobileOpen = useState('tl-sidebar-mobile', () => false)
const router = useRouter()
const { presets, applyPreset, activePreset } = useBrand()
const { data: me } = await useAsyncData('me', () => $fetch('/api/auth/me'))
const { sections } = useNavigation()

const query = ref('')
const debounced = ref('')
const showTheme = ref(false)
const showUser = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(query, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { debounced.value = value.trim() }, 250)
})

const searchResults = computed(() => {
  const term = debounced.value.toLowerCase()
  if (term.length < 2) return []
  return sections.value.flatMap(section => section.items
    .filter(item => `${section.label} ${item.label}`.toLowerCase().includes(term))
    .map(item => ({ ...item, section: section.label })))
})

function go(to: string) {
  query.value = ''
  debounced.value = ''
  showTheme.value = false
  showUser.value = false
  router.push(to)
}

async function logout() {
  try { await $fetch('/api/auth/logout', { method: 'POST' }) } catch { /* session may already be expired */ }
  await router.push('/login')
}

function closePopovers() {
  showTheme.value = false
  showUser.value = false
}

function handleDocumentClick(event: MouseEvent) {
  if (!(event.target as HTMLElement).closest('[data-popover]')) closePopovers()
}

onMounted(() => document.addEventListener('click', handleDocumentClick))
onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
    <div class="flex h-16 items-center gap-3 px-4 sm:px-6">
      <button type="button" class="-ml-1.5 rounded-lg p-1.5 text-ink-soft transition hover:bg-canvas lg:hidden" aria-label="Open navigation" @click="mobileOpen = true">
        <AppIcon name="bars-3" :size="21" />
      </button>

      <div class="relative mx-auto min-w-0 max-w-xl flex-1" data-popover>
        <div class="relative">
          <AppIcon name="magnifying-glass" :size="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            ref="searchInput"
            v-model="query"
            type="search"
            autocomplete="off"
            placeholder="Search ERP workspaces…"
            class="w-full rounded-full border border-transparent bg-canvas py-2.5 pl-10 pr-10 text-sm text-ink placeholder:text-ink-faint transition focus:border-primary/30 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/15"
            @keydown.enter.prevent="searchResults[0] && go(searchResults[0].to)"
            @keydown.esc="query = ''; debounced = ''"
          >
          <button v-if="query" type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition hover:text-ink" aria-label="Clear search" @click="query = ''; debounced = ''; searchInput?.focus()">
            <AppIcon name="x-mark" :size="15" />
          </button>
        </div>

        <Transition name="pop">
          <div v-if="debounced.length >= 2" class="absolute left-0 right-0 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
            <p v-if="!searchResults.length" class="px-4 py-6 text-center text-xs text-ink-faint">No ERP workspaces match “{{ debounced }}”.</p>
            <div v-else class="max-h-[60vh] overflow-y-auto py-2">
              <p class="px-4 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint">ERP workspaces</p>
              <button
                v-for="item in searchResults"
                :key="item.to"
                type="button"
                class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-primary-soft/60"
                @click="go(item.to)"
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-ink">{{ item.label }}</span>
                  <span class="mt-0.5 block truncate text-[11px] text-ink-faint">{{ item.section }}</span>
                </span>
                <AppIcon name="arrow-right" :size="14" class="shrink-0 text-ink-faint" />
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-1.5">
        <div class="relative" data-popover>
          <button type="button" class="relative rounded-lg p-2 text-ink-soft transition hover:bg-canvas" title="White-label theme" aria-label="White-label theme" @click="showTheme = !showTheme; showUser = false">
            <AppIcon name="sparkles" :size="19" />
          </button>
          <Transition name="pop">
            <div v-if="showTheme" class="absolute right-0 mt-2 w-72 rounded-xl border border-line bg-surface p-3 shadow-xl">
              <p class="px-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">White-label theme</p>
              <button v-for="preset in presets" :key="preset.key" type="button" class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-canvas" @click="applyPreset(preset); showTheme = false">
                <span class="flex -space-x-1.5">
                  <span class="h-5 w-5 rounded-full ring-2 ring-white" :style="{ background: preset.theme.primary }" />
                  <span class="h-5 w-5 rounded-full ring-2 ring-white" :style="{ background: preset.theme.accent }" />
                </span>
                <span class="flex-1 text-xs font-medium text-ink">{{ preset.label }}</span>
                <AppIcon v-if="activePreset === preset.key" name="check" :size="15" class="text-primary" />
              </button>
              <p class="px-1 pt-2 text-[10px] leading-relaxed text-ink-faint">Organizations can set their name, colours, and currency in one place.</p>
            </div>
          </Transition>
        </div>

        <div class="relative ml-1 border-l border-line pl-2" data-popover>
          <button type="button" class="flex items-center gap-2 rounded-lg p-1 transition hover:bg-canvas sm:gap-2.5" aria-label="Open account menu" :aria-expanded="showUser" @click="showUser = !showUser; showTheme = false">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
              {{ me?.name?.split(' ').map((word: string) => word[0]).join('').slice(0, 2) ?? 'BD' }}
            </span>
            <span class="hidden max-w-[140px] text-left leading-tight sm:block">
              <span class="block truncate text-xs font-semibold text-ink">{{ me?.name ?? 'BusinessDesk user' }}</span>
              <span class="block truncate text-[10px] text-ink-faint">{{ me?.username ?? 'ERP workspace' }}</span>
            </span>
            <AppIcon name="chevron-down" :size="14" class="hidden text-ink-faint sm:block" />
          </button>

          <Transition name="pop">
            <div v-if="showUser" class="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
              <div class="border-b border-line bg-canvas/50 px-4 py-3">
                <p class="text-sm font-semibold text-ink">{{ me?.name ?? 'BusinessDesk user' }}</p>
                <p class="truncate text-[11px] text-ink-faint">{{ me?.username }}</p>
              </div>
              <div class="py-1.5">
                <NuxtLink to="/modules" class="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-soft hover:bg-primary-soft/60" @click="showUser = false">
                  <AppIcon name="home" :size="17" class="text-ink-faint" /> Switch workspace
                </NuxtLink>
                <button type="button" class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50" @click="logout">
                  <AppIcon name="arrow-left-on-rectangle" :size="17" /> Sign out
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </header>
</template>
