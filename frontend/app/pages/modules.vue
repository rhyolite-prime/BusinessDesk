<script setup lang="ts">
import { ArrowRight, Banknote, BookOpenCheck, Boxes, Building2, Factory, Files, Home, Landmark, LockKeyhole, LogOut, PackageCheck, Printer, ReceiptText, School, ShoppingCart, Smartphone, Truck, UsersRound, WalletCards, X } from '@lucide/vue'
import type { Component } from 'vue'

definePageMeta({ layout: false })
useHead({ title: 'Modules Workspace' })

interface BusinessModule {
  id: string
  name: string
  category: string
  description: string
  status: 'available' | 'locked'
  icon: Component
  to?: string
}

const { user, isDemo, logout } = useBusinessDeskAuth()
const subscriptionsOpen = ref(false)
const signingOut = ref(false)

const businessModules: BusinessModule[] = [
  {
    id: 'school-information-system',
    name: 'School Information System',
    category: 'Academic & Admin Automation',
    description: 'Manage student records, classes, staff, exams, attendance, and communications.',
    status: 'locked',
    icon: School,
  },
  {
    id: 'payroll',
    name: 'Payroll',
    category: 'Automated Salary Management',
    description: 'Handle employee compensation, tax deductions, payslips, bonuses, and compliance.',
    status: 'locked',
    icon: Banknote,
  },
  {
    id: 'print-intelligence',
    name: 'Print Intelligence',
    category: 'Hardware Health & Analytics',
    description: 'Monitor printer status, track consumables, and analyze print behavior and costs.',
    status: 'locked',
    icon: Printer,
  },
  {
    id: 'general-ledger',
    name: 'General Ledger',
    category: 'Core Accounting Engine',
    description: 'Record all financial transactions, manage journal entries, and maintain a balanced ledger.',
    status: 'available',
    icon: BookOpenCheck,
    to: '/ledger',
  },
  {
    id: 'accounts-payable',
    name: 'Accounts Payable',
    category: 'Vendor & Payment Control',
    description: 'Track outstanding bills, manage vendor relationships, and schedule timely payments.',
    status: 'locked',
    icon: ReceiptText,
  },
  {
    id: 'accounts-receivable',
    name: 'Accounts Receivable',
    category: 'Customer Billing & Collection',
    description: 'Manage invoices, track incoming payments, and monitor outstanding receivables.',
    status: 'locked',
    icon: WalletCards,
  },
  {
    id: 'fixed-assets',
    name: 'Fixed Assets',
    category: 'Asset Lifecycle Tracking',
    description: 'Record, depreciate, and monitor physical assets to ensure accurate accounting.',
    status: 'locked',
    icon: PackageCheck,
  },
  {
    id: 'point-of-sale',
    name: 'Point Of Sale',
    category: 'Sales & Inventory Checkout',
    description: 'Process sales, manage stock levels, generate receipts, and sync data instantly.',
    status: 'locked',
    icon: ShoppingCart,
  },
  {
    id: 'human-resource',
    name: 'Human Resource',
    category: 'Employee Lifecycle',
    description: 'Recruit, onboard, manage staff records, track performance and handle leave.',
    status: 'locked',
    icon: UsersRound,
  },
  {
    id: 'inventory',
    name: 'Inventory',
    category: 'Stock Tracking & Control',
    description: 'Monitor item quantities, manage warehouse stock, and set reorder levels easily.',
    status: 'locked',
    icon: Boxes,
  },
  {
    id: 'supply-chain',
    name: 'Supply Chain',
    category: 'Procurement & Logistics',
    description: 'Manage vendors, purchase orders, transportation, and delivery processes smoothly.',
    status: 'locked',
    icon: Truck,
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    category: 'Production Control',
    description: 'Plan and track production orders, manage BOMs, and monitor raw material usage.',
    status: 'locked',
    icon: Factory,
  },
  {
    id: 'document-management',
    name: 'Document Management',
    category: 'Smart Filing, Paperless Records, Fast Retrieval',
    description: 'Centralize, store, organize, and share documents with version control, approvals, and fast search.',
    status: 'locked',
    icon: Files,
  },
  {
    id: 'property-rentals',
    name: 'Property Rentals',
    category: 'Real Estate Leasing',
    description: 'Manage rental listings, track tenant agreements, payments and handle maintenance.',
    status: 'locked',
    icon: Home,
  },
  {
    id: 'core-banking',
    name: 'Core Banking',
    category: 'Core Banking Platform',
    description: 'Designed for microfinance institutions, savings and credit cooperative organizations, and credit unions.',
    status: 'locked',
    icon: Landmark,
  },
  {
    id: 'short-code-express',
    name: 'Short Code Express',
    category: 'Short Code Express',
    description: 'An end-to-end infrastructure platform used to purchase, build and deploy USSD short codes and interactive mobile menus at scale.',
    status: 'locked',
    icon: Smartphone,
  },
]

const currentName = computed(() => user.value?.displayName || user.value?.username || 'BusinessDesk user')
const accountId = computed(() => user.value?.accountId || 'Account ID unavailable')
const initials = computed(() => currentName.value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'BD')
const availableCount = computed(() => businessModules.filter((module) => module.status === 'available').length)
const lockedCount = computed(() => businessModules.filter((module) => module.status === 'locked').length)

async function signOut() {
  signingOut.value = true
  await logout()
}
</script>

<template>
  <main class="min-h-screen bg-[#f7f8fa] text-slate-800 dark:bg-[#101716] dark:text-slate-100">
    <div class="mx-auto max-w-[1600px] px-4 pb-8 pt-5 sm:px-6 lg:px-7">
      <header class="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 class="text-[18px] font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">Modules Workspace</h1>
          <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Access your active tools or discover new modules to empower your business.</p>
          <p class="mt-1.5 text-[10px] text-slate-400">Account: <span class="font-medium text-slate-500 dark:text-slate-300">{{ accountId }}</span></p>
        </div>

        <div class="flex items-center justify-between gap-3 sm:justify-end">
          <button type="button" class="inline-flex h-9 items-center gap-2 rounded-full border border-sky-200 bg-white px-4 text-[11px] font-semibold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-sky-900 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-slate-800 dark:focus:ring-sky-950" @click="subscriptionsOpen = true">
            <ShoppingCart :size="14" /> Manage Subscriptions
          </button>
          <span class="hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" />
          <div class="flex min-w-0 items-center gap-2">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e5eee9] text-[10px] font-bold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">{{ initials }}</span>
            <span class="hidden max-w-[150px] sm:block">
              <span class="block truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">{{ currentName }}</span>
              <span class="block truncate text-[9px] text-slate-400">{{ user?.username }}</span>
            </span>
          </div>
          <button type="button" :disabled="signingOut" aria-label="Sign out" title="Sign out" class="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60 dark:hover:bg-rose-950/40 dark:hover:text-rose-300" @click="signOut">
            <LogOut :size="15" />
          </button>
        </div>
      </header>

      <div v-if="isDemo" class="mb-5 flex items-center gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/25">
        <LockKeyhole :size="13" class="shrink-0 text-amber-700 dark:text-amber-300" />
        <p class="text-[10px] leading-4 text-amber-900/80 dark:text-amber-200/80"><span class="font-semibold">Preview-only session.</span> Real authentication and module subscription services are not connected. The lock indicators below are illustrative.</p>
      </div>
      <p v-else class="mb-5 text-[10px] text-slate-400">Module access indicators are placeholders until a subscription service is connected.</p>

      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Business modules">
        <article
          v-for="module in businessModules"
          :key="module.id"
          class="relative flex min-h-[150px] flex-col rounded-[14px] border bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] transition dark:bg-[#15201e]"
          :class="module.status === 'available'
            ? 'border-brand-200 hover:border-brand-300 hover:shadow-[0_8px_22px_rgba(30,93,80,0.08)] dark:border-brand-900 dark:hover:border-brand-700'
            : 'border-slate-200/80 dark:border-slate-800'"
        >
          <span
            class="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-medium"
            :class="module.status === 'available'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'"
          >
            <LockKeyhole v-if="module.status === 'locked'" :size="10" />
            <span v-else class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {{ module.status === 'available' ? 'Available' : 'Locked' }}
          </span>

          <div class="flex min-w-0 items-center gap-3 pr-14">
            <span class="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <component :is="module.icon" :size="19" :stroke-width="1.8" />
            </span>
            <h2 class="text-[13px] font-semibold leading-5 text-slate-700 dark:text-slate-200">{{ module.name }}</h2>
          </div>

          <p class="mt-2.5 text-[9px] font-medium text-slate-500 dark:text-slate-400">{{ module.category }}</p>
          <p class="mt-1 text-[9px] leading-[1.5] text-slate-400 dark:text-slate-500">{{ module.description }}</p>
          <NuxtLink v-if="module.to" :to="module.to" class="mt-auto inline-flex w-fit items-center gap-1 pt-2 text-[10px] font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200">
            Open module <ArrowRight :size="12" />
          </NuxtLink>
        </article>
      </section>

      <Teleport to="body">
        <div v-if="subscriptionsOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" role="presentation" @click.self="subscriptionsOpen = false" @keydown.esc="subscriptionsOpen = false">
          <section role="dialog" aria-modal="true" aria-labelledby="subscriptions-title" class="w-full max-w-[430px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#15201e]">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-700 dark:text-brand-300">Organization modules</p>
                <h2 id="subscriptions-title" class="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Manage Subscriptions</h2>
              </div>
              <button type="button" aria-label="Close subscriptions dialog" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" @click="subscriptionsOpen = false"><X :size="17" /></button>
            </div>
            <div class="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/25">
              <p class="text-xs font-semibold text-amber-900 dark:text-amber-200">Subscription management is not connected yet.</p>
              <p class="mt-1 text-[11px] leading-5 text-amber-900/75 dark:text-amber-200/75">This catalog is a UI preview. The lock labels are illustrative and do not reflect a verified subscription or access decision.</p>
            </div>
            <div class="mt-5 grid grid-cols-2 gap-3">
              <div class="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700"><p class="text-[10px] text-slate-400">Built module</p><p class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ availableCount }}</p></div>
              <div class="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700"><p class="text-[10px] text-slate-400">Other modules</p><p class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ lockedCount }}</p></div>
            </div>
            <div class="mt-5 flex justify-end">
              <button type="button" class="rounded-lg bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-800" @click="subscriptionsOpen = false">Close</button>
            </div>
          </section>
        </div>
      </Teleport>
    </div>
  </main>
</template>
