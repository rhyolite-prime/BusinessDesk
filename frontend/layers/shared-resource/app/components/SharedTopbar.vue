<script setup lang="ts">
import { ArrowRight, Bell, ChevronDown, LayoutGrid, LogOut, Menu, Moon, Search, Sun, X } from '@lucide/vue'

interface SearchNavigationItem {
  label: string
  detail: string
  to: string
}

const props = withDefaults(defineProps<{
  dark: boolean
  moduleId?: string
  moduleName?: string
  dashboardTo?: string
  pageTitle?: string
  searchItems?: SearchNavigationItem[]
}>(), {
  dark: false,
  moduleId: 'general-ledger',
  moduleName: 'General Ledger',
  dashboardTo: '/ledger',
  pageTitle: '',
  searchItems: undefined,
})
const emit = defineEmits<{ toggleMenu: []; toggleTheme: [] }>()
const route = useRoute()
const router = useRouter()
const { user, logout } = useBusinessDeskAuth()
const isLedgerWorkspace = computed(() => props.moduleId === 'general-ledger')

const searchQuery = ref('')
const searchFocused = ref(false)
const notificationsOpen = ref(false)
const userMenuOpen = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const notificationJournals = ref<Array<{ id: string; batchNumber: string; description: string; date: string }>>([])
const notificationsLoading = ref(false)
const notificationsLoaded = ref(false)
const notificationsError = ref(false)

const currentName = computed(() => user.value?.displayName || user.value?.username || 'BusinessDesk user')
const avatarInitials = computed(() => currentName.value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'BD')
const pageTitle = computed(() => {
  if (props.pageTitle) return props.pageTitle
  if (route.path.startsWith('/modules/')) return props.moduleName
  if (route.path === '/ledger/account-heads') return 'Account Heads'
  if (route.path === '/ledger/account-controls') return 'Chart of Account Control'
  if (route.path === '/ledger/budgets') return 'Budget'
  if (route.path === '/ledger/default-gl-numbers') return 'Default GL Numbers'
  if (route.path === '/ledger/imprest-categories') return 'Imprest Categories'
  if (route.path === '/ledger/imprests/payroll-loans') return 'Convert Outstanding Balance to Payroll Loans'
  if (route.path.startsWith('/ledger/imprests')) return 'Accountable imprests'
  if (route.path === '/ledger/petty-cash') return 'Petty Cash Transactions'
  if (route.path === '/ledger/petty-cash-recipients') return 'Petty Cash Recipients'
  if (route.path === '/ledger/bank-accounts') return 'Bank Accounts'
  if (route.path.startsWith('/ledger/accounts')) return 'Chart of Account Detail'
  if (route.path === '/ledger/journals/new') return 'New journal'
  if (route.path.startsWith('/ledger/journals')) return 'Journal entries'
  return 'Overview'
})

const fallbackSearchItems = computed(() => isLedgerWorkspace.value
  ? [
      { label: 'Overview', detail: 'General Ledger dashboard', to: '/ledger' },
      { label: 'Account Heads', detail: 'Maintain the chart-of-accounts hierarchy', to: '/ledger/account-heads' },
      { label: 'Bank Account', detail: 'Manage bank accounts and GL links', to: '/ledger/bank-accounts' },
      { label: 'Chart of Account Control', detail: 'Set control headers and number ranges', to: '/ledger/account-controls' },
      { label: 'Chart of Account Detail', detail: 'Manage posting accounts and balances', to: '/ledger/accounts' },
      { label: 'Budget', detail: 'Plan account budgets by period and unit', to: '/ledger/budgets' },
      { label: 'Default GL Numbers', detail: 'Maintain default posting-account mappings', to: '/ledger/default-gl-numbers' },
      { label: 'Imprest Categories', detail: 'Maintain accountable imprest classifications', to: '/ledger/imprest-categories' },
      { label: 'Accountable imprests', detail: 'Issue, retire, refund and write off imprests', to: '/ledger/imprests' },
      { label: 'Convert outstanding balance to payroll loans', detail: 'Select open imprest balances and create payroll deduction loans', to: '/ledger/imprests/payroll-loans' },
      { label: 'Petty Cash Transactions', detail: 'Record petty cash expense batches and preview journal entries', to: '/ledger/petty-cash' },
      { label: 'Petty Cash Recipients', detail: 'Maintain the petty cash recipient directory', to: '/ledger/petty-cash-recipients' },
      { label: 'Journal register', detail: 'Review journal batches', to: '/ledger/journals' },
      { label: 'New journal draft', detail: 'Record an accounting entry', to: '/ledger/journals/new' },
      { label: 'Module manager', detail: 'Switch workspaces', to: '/modules' },
    ]
  : [
      { label: `${props.moduleName} overview`, detail: 'Open this module landing dashboard', to: props.dashboardTo },
      { label: 'Module manager', detail: 'Browse all ERP workspaces', to: '/modules' },
    ])
const searchItems = computed(() => props.searchItems ?? fallbackSearchItems.value)
const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return []
  return searchItems.value.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(query))
})

function go(to: string) {
  searchQuery.value = ''
  searchFocused.value = false
  notificationsOpen.value = false
  userMenuOpen.value = false
  router.push(to)
}

async function toggleNotifications() {
  notificationsOpen.value = !notificationsOpen.value
  userMenuOpen.value = false
  searchFocused.value = false
  if (!notificationsOpen.value || notificationsLoaded.value || notificationsLoading.value) return

  notificationsLoading.value = true
  notificationsError.value = false
  try {
    const response = await $fetch<{ recentJournals: Array<{ id: string; batchNumber: string; description: string; date: string; status: string }> }>('/api/ledger/dashboard')
    notificationJournals.value = response.recentJournals
      .filter((journal) => journal.status === 'Pending approval')
      .slice(0, 4)
    notificationsLoaded.value = true
  } catch {
    notificationsError.value = true
  } finally {
    notificationsLoading.value = false
  }
}

function closePopovers() {
  searchFocused.value = false
  notificationsOpen.value = false
  userMenuOpen.value = false
}

function handleDocumentClick(event: MouseEvent) {
  if (!(event.target as HTMLElement).closest('[data-popover]')) closePopovers()
}

watch(searchFocused, async (open) => {
  if (open) {
    await nextTick()
    searchInput.value?.focus()
  }
})

onMounted(() => document.addEventListener('click', handleDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', handleDocumentClick))
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
    <div class="flex h-16 items-center gap-3 px-4 sm:px-6">
      <button
        type="button"
        class="-ml-1.5 rounded-lg p-1.5 text-ink-soft transition hover:bg-canvas lg:hidden"
        aria-label="Open navigation"
        @click="emit('toggleMenu')"
      >
        <Menu :size="21" />
      </button>

      <div class="hidden shrink-0 items-center gap-2 text-xs text-ink-faint lg:flex">
        <span>Workspace</span>
        <span class="text-slate-300">/</span>
        <span class="font-semibold text-ink-soft">{{ pageTitle }}</span>
      </div>

      <div class="relative mx-auto min-w-0 max-w-xl flex-1" data-popover>
        <div class="relative">
          <Search :size="17" class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="search"
            autocomplete="off"
            :placeholder="isLedgerWorkspace ? 'Search ledger pages…' : 'Search workspace…'"
            class="w-full rounded-full border border-transparent bg-canvas py-2.5 pl-10 pr-10 text-sm text-ink placeholder:text-ink-faint transition focus:border-primary/30 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/15"
            @focus="searchFocused = true"
            @keydown.esc="searchQuery = ''; searchFocused = false"
            @keydown.enter.prevent="searchResults[0] && go(searchResults[0].to)"
          >
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition hover:text-ink"
            aria-label="Clear search"
            @click="searchQuery = ''; searchInput?.focus()"
          >
            <X :size="15" />
          </button>
        </div>

        <Transition name="pop">
          <div v-if="searchFocused && searchQuery.trim()" class="absolute left-0 right-0 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
            <p v-if="!searchResults.length" class="px-4 py-6 text-center text-xs text-ink-faint">No pages match “{{ searchQuery }}”.</p>
            <div v-else class="py-2">
              <p class="px-4 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Quick navigation</p>
              <button
                v-for="result in searchResults"
                :key="result.to"
                type="button"
                class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-primary-soft/60"
                @click="go(result.to)"
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-ink">{{ result.label }}</span>
                  <span class="mt-0.5 block truncate text-[11px] text-ink-faint">{{ result.detail }}</span>
                </span>
                <ArrowRight :size="14" class="shrink-0 text-ink-faint" />
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          class="rounded-lg p-2 text-ink-soft transition hover:bg-canvas"
          :aria-label="props.dark ? 'Switch to light theme' : 'Switch to dark theme'"
          :title="props.dark ? 'Switch to light theme' : 'Switch to dark theme'"
          @click="emit('toggleTheme')"
        >
          <Sun v-if="props.dark" :size="18" />
          <Moon v-else :size="18" />
        </button>

        <div v-if="isLedgerWorkspace" class="relative" data-popover>
          <button
            type="button"
            class="relative rounded-lg p-2 text-ink-soft transition hover:bg-canvas"
            :aria-label="notificationJournals.length ? `${notificationJournals.length} recent journal approvals` : 'Notifications'"
            :aria-expanded="notificationsOpen"
            @click="toggleNotifications"
          >
            <Bell :size="18" />
            <span v-if="notificationJournals.length" class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-surface">{{ notificationJournals.length }}</span>
          </button>
          <Transition name="pop">
            <div v-if="notificationsOpen" class="absolute right-0 mt-2 w-[min(88vw,320px)] overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
              <div class="flex items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <p class="text-sm font-semibold text-ink">Awaiting approval</p>
                  <p class="mt-0.5 text-[11px] text-ink-faint">Latest journal entries</p>
                </div>
                <Badge v-if="notificationJournals.length" tone="amber" size="sm">{{ notificationJournals.length }} recent</Badge>
              </div>
              <div v-if="notificationsLoading" class="px-4 py-7 text-center text-xs text-ink-faint">Loading recent approvals…</div>
              <div v-else-if="notificationsError" class="px-4 py-7 text-center text-xs text-rose-600">Unable to load approvals. Close and reopen to retry.</div>
              <div v-else-if="notificationJournals.length" class="max-h-72 divide-y divide-line overflow-y-auto">
                <NuxtLink v-for="journal in notificationJournals" :key="journal.id" to="/ledger/journals" class="block px-4 py-3 transition hover:bg-primary-soft/40" @click="notificationsOpen = false">
                  <span class="block truncate text-xs font-semibold text-ink">{{ journal.description }}</span>
                  <span class="mt-1 flex items-center justify-between gap-3 text-[10px] text-ink-faint">
                    <span class="truncate">{{ journal.batchNumber }}</span>
                    <span class="shrink-0">{{ formatDate(journal.date) }}</span>
                  </span>
                </NuxtLink>
              </div>
              <div v-else class="px-4 py-7 text-center">
                <span class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-canvas text-ink-faint"><Bell :size="18" /></span>
                <p class="mt-3 text-xs font-semibold text-ink">All caught up</p>
                <p class="mt-1 text-[11px] leading-relaxed text-ink-faint">No recent journal entries are awaiting approval.</p>
              </div>
              <NuxtLink to="/ledger/journals" class="block border-t border-line px-4 py-2.5 text-center text-xs font-semibold text-primary transition hover:bg-primary-soft/60" @click="notificationsOpen = false">
                Open journal register <ArrowRight :size="13" class="ml-1 inline" />
              </NuxtLink>
            </div>
          </Transition>
        </div>

        <div class="mx-1 hidden h-7 w-px bg-line sm:block" />
        <NuxtLink
          to="/modules"
          class="rounded-lg p-2 text-ink-soft transition hover:bg-canvas hover:text-primary"
          aria-label="Switch to module manager"
          title="Switch workspace"
        >
          <LayoutGrid :size="18" />
        </NuxtLink>

        <div class="relative ml-1 border-l border-line pl-2" data-popover>
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg p-1 transition hover:bg-canvas sm:gap-2.5"
            aria-label="Open user menu"
            :aria-expanded="userMenuOpen"
            @click="userMenuOpen = !userMenuOpen; notificationsOpen = false; searchFocused = false"
          >
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">{{ avatarInitials }}</span>
            <span class="hidden max-w-[140px] text-left leading-tight sm:block">
              <span class="block truncate text-xs font-semibold text-ink">{{ currentName }}</span>
              <span class="mt-0.5 block truncate text-[10px] text-ink-faint">{{ user?.accountId || user?.username }}</span>
            </span>
            <ChevronDown :size="14" class="hidden text-ink-faint sm:block" />
          </button>
          <Transition name="pop">
            <div v-if="userMenuOpen" class="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
              <div class="border-b border-line bg-canvas/60 px-4 py-3">
                <p class="truncate text-sm font-semibold text-ink">{{ currentName }}</p>
                <p class="mt-0.5 truncate text-[11px] text-ink-faint">{{ user?.username }} · {{ user?.accountId }}</p>
              </div>
              <NuxtLink to="/modules" class="flex items-center gap-3 px-4 py-3 text-sm text-ink-soft transition hover:bg-primary-soft/60" @click="userMenuOpen = false">
                <LayoutGrid :size="16" class="text-ink-faint" /> Switch workspace
              </NuxtLink>
              <button type="button" class="flex w-full items-center gap-3 border-t border-line px-4 py-3 text-sm text-red-600 transition hover:bg-red-50" @click="logout()">
                <LogOut :size="16" /> Sign out
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </header>
</template>
