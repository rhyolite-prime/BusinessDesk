<script setup lang="ts">
const props = withDefaults(defineProps<{
  mobileOpen: boolean
  moduleId?: string
  moduleName?: string
  dashboardTo?: string
}>(), {
  moduleId: 'general-ledger',
  moduleName: 'General Ledger',
  dashboardTo: '/ledger',
})
const emit = defineEmits<{ close: [] }>()
const route = useRoute()
const { user, logout, refreshSession } = useBusinessDeskAuth()
await refreshSession()
const currentName = computed(() => user.value?.displayName || user.value?.username || 'BusinessDesk user')
const avatarInitials = computed(() => currentName.value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'BD')
const isLedgerWorkspace = computed(() => props.moduleId === 'general-ledger')

interface NavigationLink {
  label: string
  to?: string
  icon: string
  comingSoon?: boolean
  children?: NavigationLink[]
}

interface NavigationGroup {
  title: string
  icon: string
  links: NavigationLink[]
}

const soon = (label: string, icon = 'document-text'): NavigationLink => ({ label, icon, comingSoon: true })
const reportItem = (label: string, icon = 'document-text'): NavigationLink => ({ label, icon, comingSoon: true })

const ledgerGroups: NavigationGroup[] = [
  {
    title: 'General Ledger',
    icon: 'book-open',
    links: [
      {
        label: 'Account Setup',
        icon: 'cog-6-tooth',
        children: [
          { label: 'Account Heads', to: '/ledger/account-heads', icon: 'building-library' },
          { label: 'Bank Account', to: '/ledger/bank-accounts', icon: 'wallet' },
          { label: 'Chart of Account Control', to: '/ledger/account-controls', icon: 'cog-6-tooth' },
          { label: 'Chart of Account Detail', to: '/ledger/accounts', icon: 'document-text' },
        ],
      },
      soon('Budget', 'scale'),
      {
        label: 'Journal',
        icon: 'document-text',
        children: [
          { label: 'Journal', to: '/ledger/journals/new', icon: 'pencil-square' },
          { label: 'Journal History', to: '/ledger/journals', icon: 'clock' },
        ],
      },
      {
        label: 'Vouchers',
        icon: 'credit-card',
        children: [soon('Voucher'), soon('Voucher History', 'clock')],
      },
      {
        label: 'Accountable Imprest',
        icon: 'wallet',
        children: [soon('Imprest Categories', 'list-bullet'), soon('Imprests', 'banknotes')],
      },
      soon('Petty Cash', 'banknotes'),
      {
        label: 'Reports',
        icon: 'chart-bar-square',
        children: [
          reportItem('Trial Balance'),
          reportItem('Balance Sheet'),
          {
            label: 'Operating Statement',
            icon: 'chart-bar-square',
            children: [
              reportItem('Basic'),
              reportItem('Budget', 'scale'),
              reportItem('Budget New', 'scale'),
              reportItem('Prior Period', 'clock'),
              reportItem('Expenditure Returns'),
              reportItem('Comparative Operating Statement'),
              reportItem('Revenue', 'banknotes'),
              reportItem('Cross-Tab', 'list-bullet'),
              reportItem('Cross-Tab Quarters', 'list-bullet'),
            ],
          },
          {
            label: 'Voucher',
            icon: 'credit-card',
            children: [
              reportItem('Voucher'),
              reportItem('Official Voucher'),
              reportItem('VAT Returns'),
              reportItem('Receipt Voucher', 'banknotes'),
            ],
          },
          {
            label: 'Accountable Imprest',
            icon: 'wallet',
            children: [
              reportItem('Statement'),
              reportItem('By Employee', 'identification'),
              reportItem('By Category', 'list-bullet'),
              reportItem('Overdue Imprest', 'clock'),
            ],
          },
          {
            label: 'Reconciliation',
            icon: 'arrow-path',
            children: [
              reportItem('Reconciliation'),
              reportItem('Statement'),
              reportItem('Statement History', 'clock'),
              reportItem('Reconciliation History', 'clock'),
            ],
          },
          reportItem('Income Expenditure'),
          reportItem('GL Transaction Reports', 'chart-bar-square'),
          {
            label: 'Petty Cash',
            icon: 'banknotes',
            children: [
              reportItem('By Account'),
              reportItem('By OU', 'building-office'),
              reportItem('By Batch'),
              reportItem('By Recipient/Beneficiary', 'user'),
            ],
          },
          {
            label: 'H/W',
            icon: 'building-office',
            children: [
              reportItem('General'),
              reportItem('By Date', 'calendar-days'),
              reportItem('Posted Cheques', 'credit-card'),
            ],
          },
        ],
      },
    ],
  },
]

const moduleGroups = computed<NavigationGroup[]>(() => [
  {
    title: `${props.moduleName} workflows`,
    icon: 'document-text',
    links: [
      soon('Records & transactions'),
      soon('Approvals', 'shield-check'),
    ],
  },
  {
    title: 'Insights & reports',
    icon: 'chart-bar-square',
    links: [
      soon('Operational reports', 'chart-bar-square'),
      soon('Activity log', 'clock'),
    ],
  },
])

const groups = computed(() => isLedgerWorkspace.value ? ledgerGroups : moduleGroups.value)
const ledgerSetupLinks: NavigationLink[] = [
  { label: 'Accounting units', icon: 'building-office', comingSoon: true },
  { label: 'Preferences', icon: 'cog-6-tooth', comingSoon: true },
]
const moduleSetupLinks: NavigationLink[] = [
  { label: 'Workspace settings', icon: 'cog-6-tooth', comingSoon: true },
  { label: 'User access', icon: 'user-group', comingSoon: true },
  { label: 'Data connections', icon: 'arrow-path', comingSoon: true },
]
const setupLinks = computed(() => isLedgerWorkspace.value ? ledgerSetupLinks : moduleSetupLinks)

function comingSoonTitle(label: string) {
  return `${label} is planned for a later ${props.moduleName} phase`
}

function isActive(path?: string) {
  if (!path) return false
  if (path === '/ledger' || path === props.dashboardTo) return route.path === path
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
  <Transition name="fade">
    <div v-if="props.mobileOpen" class="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] lg:hidden" @click="emit('close')" />
  </Transition>

  <aside
    class="fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-sidebar text-white/70 transition-transform duration-200 lg:translate-x-0"
    :class="props.mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
  >
    <div class="border-b border-white/10 px-5 py-5">
      <NuxtLink to="/modules" class="block min-w-0" aria-label="BusinessDesk module manager" @click="emit('close')">
        <BrandMark dark :product-name="props.moduleName" />
      </NuxtLink>
    </div>

    <nav class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      <NuxtLink
        :to="props.dashboardTo"
        class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
        :class="isActive(props.dashboardTo) ? 'nav-active' : 'hover:bg-white/5 hover:text-white'"
        @click="emit('close')"
      >
        <AppIcon name="home" :size="18" />
        Overview
      </NuxtLink>

      <section v-for="group in groups" :key="group.title">
        <p class="mb-1.5 flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
          <AppIcon :name="group.icon" :size="13" />
          {{ group.title }}
        </p>
        <div class="space-y-0.5">
          <SharedSidebarNavItem
            v-for="link in group.links"
            :key="link.label"
            :item="link"
            :workspace-name="props.moduleName"
            @navigate="emit('close')"
          />
        </div>
      </section>

      <section>
        <p class="mb-1.5 flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
          <AppIcon name="cog-6-tooth" :size="13" /> Configuration
        </p>
        <div class="space-y-0.5">
          <button
            v-for="link in setupLinks"
            :key="link.label"
            type="button"
            disabled
            :title="comingSoonTitle(link.label)"
            class="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/30"
          >
            <AppIcon :name="link.icon" :size="18" />
            <span class="min-w-0 flex-1 truncate">{{ link.label }}</span>
            <span class="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/40">Soon</span>
          </button>
        </div>
      </section>
    </nav>

    <div class="border-t border-white/10 px-4 py-3">
      <div class="flex min-w-0 items-center gap-3 rounded-xl px-2 py-2">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-sidebar">{{ avatarInitials }}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-xs font-semibold text-white">{{ currentName }}</span>
          <span class="mt-0.5 block truncate text-[10px] text-white/45">{{ user?.accountId || user?.username }}</span>
        </span>
        <button
          type="button"
          class="rounded-md p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
          aria-label="Sign out"
          title="Sign out"
          @click="logout()"
        >
          <AppIcon name="arrow-left-on-rectangle" :size="17" />
        </button>
      </div>
      <p class="px-2 pt-1 text-[10px] leading-relaxed text-white/35">BusinessDesk ERP · {{ props.moduleName }} workspace</p>
    </div>
  </aside>
</template>
