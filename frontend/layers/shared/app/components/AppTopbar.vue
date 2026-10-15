<script setup lang="ts">
const mobileOpen = useState('tl-sidebar-mobile', () => false)
const router = useRouter()
const { brand, presets, applyPreset, activePreset } = useBrand()
const { date } = useFormat()

// ── session ──
const { data: me } = await useAsyncData('me', () => $fetch('/api/auth/me'))

// ── pending approvals (maker-checker) ──
const { data: pending } = await useAsyncData('topbar-tasks',
  () => $fetch<any>('/api/system/tasks', { query: { status: 'pending', size: 6 } }))
const pendingCount = computed(() => pending.value?.totalFilteredCount ?? 0)
const showBell = ref(false)
const showTheme = ref(false)

// ── global search ──
const q = ref('')
const debounced = ref('')
let t: any
watch(q, v => { clearTimeout(t); t = setTimeout(() => { debounced.value = v.trim() }, 280) })
const { data: results, pending: searching } = await useAsyncData('topbar-search',
  () => debounced.value.length >= 2 ? $fetch('/api/search', { query: { q: debounced.value } }) : Promise.resolve(null),
  { watch: [debounced] })

const groups = computed(() => {
  if (!results.value) return []
  return [
    { key: 'clients', label: 'Clients', icon: 'user', items: results.value.clients },
    { key: 'loans', label: 'Loan Accounts', icon: 'banknotes', items: results.value.loans },
    { key: 'savings', label: 'Savings Accounts', icon: 'wallet', items: results.value.savings },
    { key: 'groups', label: 'Groups', icon: 'user-group', items: results.value.groups },
    { key: 'staff', label: 'Staff', icon: 'identification', items: results.value.staff },
  ].filter(g => g.items?.length)
})

function go(to: string) {
  q.value = ''; debounced.value = ''
  router.push(to)
}

const showUser = ref(false)

async function logout() {
  try { await $fetch('/api/auth/logout', { method: 'POST' }) } catch (e) { /* noop */ }
  await router.push('/login')
}

function closePopovers() {
  showBell.value = false; showTheme.value = false; showUser.value = false
}
if (import.meta.client) {
  onMounted(() => document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('[data-popover]')) closePopovers()
  }))
}
</script>

<template>
  <header class="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-line">
    <div class="flex items-center gap-3 px-4 sm:px-6 h-16">
      <button class="lg:hidden text-ink-soft p-1.5 -ml-1.5" @click="mobileOpen = true">
        <AppIcon name="bars-3" :size="22" />
      </button>

      <!-- Global cross-module search -->
      <div class="relative flex-1 max-w-xl" data-popover>
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
          <AppIcon name="magnifying-glass" :size="17" />
        </span>
        <input v-model="q" type="text"
          placeholder="Search clients, loan and savings accounts, groups, staff…"
          class="w-full pl-10 pr-8 py-2.5 rounded-full bg-canvas border border-transparent text-sm
                 focus:outline-none focus:bg-white focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition" />
        <button v-if="q" class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
          @click="q = ''"><AppIcon name="x-mark" :size="15" /></button>

        <Transition name="pop">
          <div v-if="debounced.length >= 2"
            class="absolute mt-2 w-full bg-surface border border-line rounded-xl shadow-xl overflow-hidden">
            <div v-if="searching" class="px-4 py-6 text-center text-xs text-ink-faint">Searching…</div>
            <div v-else-if="!groups.length" class="px-4 py-6 text-center text-xs text-ink-faint">
              No matches for “{{ debounced }}”.
            </div>
            <div v-else class="max-h-[60vh] overflow-y-auto py-2">
              <div v-for="g in groups" :key="g.key">
                <p class="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint flex items-center gap-1.5">
                  <AppIcon :name="g.icon" :size="12" /> {{ g.label }}
                </p>
                <button v-for="item in g.items" :key="g.key + item.id"
                  class="w-full text-left px-4 py-2 hover:bg-primary-soft/60 flex items-center gap-3"
                  @click="go(item.to)">
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-medium text-ink truncate">{{ item.label }}</span>
                    <span class="block text-[11px] text-ink-faint truncate">{{ item.sub }}</span>
                  </span>
                  <Badge size="sm" :tone="item.status === 'active' ? 'green' : item.status === 'pending' || item.status === 'submitted' ? 'amber' : item.status === 'closed' || item.status === 'rejected' || item.status === 'writtenoff' ? 'gray' : 'blue'">
                    {{ item.status }}
                  </Badge>
                  <AppIcon name="chevron-right" :size="14" class="text-ink-faint" />
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <div class="flex items-center gap-1.5 ml-auto">
        <!-- Brand / white-label switcher -->
        <div class="relative" data-popover>
          <button class="p-2 rounded-lg text-ink-soft hover:bg-canvas relative" title="White-label theme"
            @click="showTheme = !showTheme; showBell = false">
            <AppIcon name="sparkles" :size="19" />
          </button>
          <Transition name="pop">
            <div v-if="showTheme" class="absolute right-0 mt-2 w-72 bg-surface border border-line rounded-xl shadow-xl p-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-ink-faint px-1 pb-2">White-label theme</p>
              <button v-for="p in presets" :key="p.key"
                class="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-canvas text-left"
                @click="applyPreset(p); showTheme = false">
                <span class="flex -space-x-1.5">
                  <span class="w-5 h-5 rounded-full ring-2 ring-white" :style="{ background: p.theme.primary }" />
                  <span class="w-5 h-5 rounded-full ring-2 ring-white" :style="{ background: p.theme.accent }" />
                </span>
                <span class="text-xs font-medium text-ink flex-1">{{ p.label }}</span>
                <AppIcon v-if="activePreset === p.key" name="check" :size="15" class="text-primary" />
              </button>
              <p class="text-[10px] text-ink-faint px-1 pt-2 leading-relaxed">
                Tenants set their brand once in <code>app.config.ts</code> — colours, name, currency.
              </p>
            </div>
          </Transition>
        </div>

        <!-- Notifications / pending maker-checker tasks -->
        <div class="relative" data-popover>
          <button class="p-2 rounded-lg text-ink-soft hover:bg-canvas relative"
            @click="showBell = !showBell; showTheme = false">
            <AppIcon name="bell" :size="19" />
            <span v-if="pendingCount"
              class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {{ pendingCount }}
            </span>
          </button>
          <Transition name="pop">
            <div v-if="showBell" class="absolute right-0 mt-2 w-80 bg-surface border border-line rounded-xl shadow-xl overflow-hidden">
              <div class="px-4 py-3 border-b border-line flex items-center justify-between">
                <p class="text-sm font-semibold text-ink">Pending approvals</p>
                <Badge size="sm" tone="amber">{{ pendingCount }} awaiting</Badge>
              </div>
              <div class="max-h-80 overflow-y-auto">
                <button v-for="t in pending?.pageItems ?? []" :key="t.id"
                  class="w-full text-left px-4 py-3 border-b border-line/60 hover:bg-primary-soft/50"
                  @click="go('/system/tasks')">
                  <p class="text-xs font-semibold text-ink flex items-center gap-2">
                    <AppIcon name="shield-check" :size="13" class="text-primary" />{{ t.action }}
                  </p>
                  <p class="text-[11px] text-ink-faint truncate mt-0.5">{{ t.entityLabel }}</p>
                  <p class="text-[10px] text-ink-faint mt-0.5">by {{ t.makerName }} · {{ date(t.createdDate) }}</p>
                </button>
              </div>
              <NuxtLink to="/system/tasks"
                class="block px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-primary-soft/60">
                Open maker-checker queue →
              </NuxtLink>
            </div>
          </Transition>
        </div>

        <!-- User menu -->
        <div class="relative pl-2 ml-1 border-l border-line" data-popover>
          <button class="flex items-center gap-2.5 p-1 rounded-lg hover:bg-canvas"
            @click="showUser = !showUser; showBell = false; showTheme = false">
            <span class="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold">
              {{ me?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2) ?? 'AM' }}
            </span>
            <span class="hidden sm:block leading-tight text-left">
              <span class="block text-xs font-semibold text-ink">{{ me?.name ?? '…' }}</span>
              <span class="block text-[10px] text-ink-faint">{{ me?.roleNames?.[0] ?? '' }}</span>
            </span>
            <AppIcon name="chevron-down" :size="14" class="text-ink-faint hidden sm:block" />
          </button>

          <Transition name="pop">
            <div v-if="showUser" class="absolute right-0 mt-2 w-64 bg-surface border border-line rounded-xl shadow-xl overflow-hidden">
              <div class="px-4 py-3 border-b border-line bg-canvas/50">
                <p class="text-sm font-semibold text-ink">{{ me?.name }}</p>
                <p class="text-[11px] text-ink-faint truncate">{{ me?.username }} · {{ me?.officeName }}</p>
              </div>
              <div class="py-1.5">
                <NuxtLink to="/profile" class="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-soft hover:bg-primary-soft/60" @click="showUser = false">
                  <AppIcon name="user" :size="17" class="text-ink-faint" /> View profile
                </NuxtLink>
                <NuxtLink to="/settings" class="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-soft hover:bg-primary-soft/60" @click="showUser = false">
                  <AppIcon name="cog-6-tooth" :size="17" class="text-ink-faint" /> Settings
                </NuxtLink>
                <NuxtLink :to="'/settings?tab=security'" class="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-soft hover:bg-primary-soft/60" @click="showUser = false">
                  <AppIcon name="shield-check" :size="17" class="text-ink-faint" /> Reset password &amp; 2FA
                </NuxtLink>
              </div>
              <div class="border-t border-line py-1.5">
                <button class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50" @click="logout">
                  <AppIcon name="arrow-left-on-rectangle" :size="17" /> Log out
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </header>
</template>
