<script setup lang="ts">
const props = withDefaults(defineProps<{
  mobileOpen: boolean
  moduleId?: string
  moduleName?: string
  dashboardTo?: string
  navigationGroups?: NavigationGroup[]
}>(), {
  moduleId: 'general-ledger',
  moduleName: 'General Ledger',
  dashboardTo: '/ledger',
  navigationGroups: undefined,
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
      { label: 'Accounting Units', to: '/ledger/accounting-units', icon: 'building-office' },
      {
        label: 'Shared config',
        icon: 'cog-6-tooth',
        children: [
          { label: 'Company profile', to: '/ledger/shared-config/company-profile', icon: 'building-office' },
          { label: 'Cost Centers', to: '/ledger/shared-config/cost-centers', icon: 'building-library' },
          { label: 'Currencies', to: '/ledger/shared-config/currencies', icon: 'banknotes' },
          { label: 'Supplier groups', to: '/ledger/shared-config/supplier-groups', icon: 'user-group' },
          { label: 'Customers', to: '/ledger/shared-config/customers', icon: 'user-group' },
          { label: 'Suppliers', to: '/ledger/shared-config/suppliers', icon: 'truck' },
          { label: 'Employees', to: '/ledger/shared-config/employees', icon: 'identification' },
          { label: 'Banks and branches', to: '/ledger/shared-config/banks-and-branches', icon: 'building-library' },
          { label: 'System numbers', to: '/ledger/shared-config/system-numbers', icon: 'document-text' },
          { label: 'Default GL Numbers', to: '/ledger/default-gl-numbers', icon: 'document-text' },
        ],
      },
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
      { label: 'Budget', to: '/ledger/budgets', icon: 'scale' },
      {
        label: 'Journal',
        icon: 'document-text',
        children: [
          { label: 'Journal', to: '/ledger/journals/new', icon: 'pencil-square' },
          { label: 'Journal History', to: '/ledger/journals', icon: 'clock' },
          { label: 'Accounting Periods', to: '/ledger/accounting-periods', icon: 'calendar-days' },
        ],
      },
      {
        label: 'Vouchers',
        icon: 'credit-card',
        children: [
          { label: 'Voucher', to: '/ledger/vouchers', icon: 'credit-card' },
          { label: 'Voucher History', to: '/ledger/vouchers/history', icon: 'clock' },
        ],
      },
      {
        label: 'Accountable Imprest',
        icon: 'wallet',
        children: [
          { label: 'Imprest Categories', to: '/ledger/imprest-categories', icon: 'list-bullet' },
          { label: 'Imprests', to: '/ledger/imprests', icon: 'banknotes' },
          { label: 'Convert to Payroll Loans', to: '/ledger/imprests/payroll-loans', icon: 'arrow-path' },
        ],
      },
      {
        label: 'Petty Cash',
        icon: 'banknotes',
        children: [
          { label: 'Petty Cash Transactions', to: '/ledger/petty-cash', icon: 'banknotes' },
          { label: 'Petty Cash Recipients', to: '/ledger/petty-cash-recipients', icon: 'users' },
        ],
      },
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

const groups = computed(() => isLedgerWorkspace.value ? ledgerGroups : (props.navigationGroups ?? moduleGroups.value))
const ledgerSetupLinks: NavigationLink[] = [
  { label: 'Accounting units', icon: 'building-office', comingSoon: true },
  { label: 'Preferences', icon: 'cog-6-tooth', to: '/preferences' },
  { label: 'Account & subscription', icon: 'building-office', to: '/account' },
]
const moduleSetupLinks: NavigationLink[] = [
  { label: 'Preferences', icon: 'cog-6-tooth', to: '/preferences' },
  { label: 'Account & subscription', icon: 'building-office', to: '/account' },
  { label: 'User access', icon: 'user-group', comingSoon: true },
  { label: 'Data connections', icon: 'arrow-path', comingSoon: true },
]
const setupLinks = computed(() => isLedgerWorkspace.value ? ledgerSetupLinks : moduleSetupLinks)

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

      <section v-if="isLedgerWorkspace || !props.navigationGroups">
        <p class="mb-1.5 flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
          <AppIcon name="cog-6-tooth" :size="13" /> Configuration
        </p>
        <div class="space-y-0.5">
          <SharedSidebarNavItem
            v-for="link in setupLinks"
            :key="link.label"
            :item="link"
            :workspace-name="props.moduleName"
            @navigate="emit('close')"
          />
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
      <p class="px-2 pt-1 text-[10px] leading-relaxed text-white/35">BusinessDesk 720 · {{ props.moduleName }} workspace</p>
    </div>
  </aside>
</template>
