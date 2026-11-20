<script setup lang="ts">
import { useFleetUnitId, useFleetWorkshop } from '../../features/fleet-workshop/useFleetWorkshop'
import { emptyFleetDashboard, type FleetDashboardSummary } from '../../features/fleet-workshop/fleet-types'
import { fleetErrorMessage, fleetStatusTone, humanLabel } from '../../features/fleet-workshop/fleet-helpers'
import { fleetPages } from '../../features/fleet-workshop/navigation'

definePageMeta({ layout: 'admin-fleet' })
useHead({ title: 'Fleet & workshop overview' })

const api = useFleetWorkshop()
const unitId = useFleetUnitId()
const dash = ref<FleetDashboardSummary>(emptyFleetDashboard())
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    dash.value = await api.dashboard(unitId.value || undefined)
  } catch (e) {
    error.value = fleetErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch(unitId, load)
onMounted(load)

const links = fleetPages.filter((p) => p.path !== '/fleet-workshop')

const fleetChartOption = computed(() => ({
  tooltip: { trigger: 'item' as const },
  series: [
    {
      type: 'pie' as const,
      radius: ['52%', '78%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: [
        { name: 'Active', value: dash.value.fleet.active, itemStyle: { color: '#10b981' } },
        { name: 'In Workshop', value: dash.value.fleet.inWorkshop, itemStyle: { color: '#3b82f6' } },
        { name: 'Breakdown', value: dash.value.fleet.breakdown, itemStyle: { color: '#ef4444' } },
        {
          name: 'Other / Inactive',
          value: Math.max(0, dash.value.fleet.totalVehicles - dash.value.fleet.active - dash.value.fleet.inWorkshop - dash.value.fleet.breakdown),
          itemStyle: { color: '#94a3b8' },
        },
      ],
    },
  ],
}))

const attentionItems = computed(() => [
  {
    label: 'Vehicles in breakdown',
    value: dash.value.fleet.breakdown,
    to: '/fleet-workshop/vehicles',
    tone: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300',
  },
  {
    label: 'Stalled meters awaiting reading',
    value: dash.value.fleet.stalledMeters,
    to: '/fleet-workshop/meters',
    tone: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300',
  },
  {
    label: 'Services due within 7 days',
    value: dash.value.schedules.dueWithin7Days,
    to: '/fleet-workshop/schedules',
    tone: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300',
  },
  {
    label: 'Job cards awaiting parts',
    value: dash.value.workshop.awaitingParts,
    to: '/fleet-workshop/job-cards',
    tone: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300',
  },
  {
    label: 'Fuel tolerance alerts',
    value: dash.value.fuel.toleranceAlerts,
    to: '/fleet-workshop/fuel-lubs',
    tone: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300',
  },
  {
    label: 'Unpaid workshop diary entries',
    value: dash.value.diary.unpaidCount,
    to: '/fleet-workshop/diary',
    tone: 'text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300',
  },
])
</script>

<template>
  <section class="space-y-7" :aria-busy="loading">
    <PageHeader
      title="Fleet & Workshop Management"
      subtitle="Asset availability, preventive schedules, workshop job costing, fuel tolerances and field diary entries."
      icon="cog-6-tooth"
    >
      <BaseButton variant="secondary" icon="plus" to="/fleet-workshop/vehicles?new=1">
        Register asset
      </BaseButton>
      <BaseButton variant="secondary" icon="plus" to="/fleet-workshop/diary?new=1">
        Diary entry
      </BaseButton>
      <BaseButton variant="secondary" icon="plus" to="/fleet-workshop/schedules?new=1">
        Add schedule
      </BaseButton>
      <BaseButton icon="plus" to="/fleet-workshop/job-cards?new=1">
        Open job card
      </BaseButton>
    </PageHeader>

    <p v-if="error" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
      {{ error }}
    </p>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Fleet vehicles" :value="dash.fleet.totalVehicles" :hint="`${dash.fleet.active} active · ${dash.fleet.heavyMachinery} heavy`" icon="cube" tone="primary" />
      <StatCard label="Open job cards" :value="dash.workshop.openJobs" :hint="`${dash.workshop.majorProjects} major projects · ${dash.workshop.unbilledCustomerJobs} unbilled`" icon="document-text" tone="blue" />
      <StatCard label="Workshop job cost" :value="formatCurrency(dash.workshop.jobCostTotal)" :hint="`Billable: ${formatCurrency(dash.workshop.billableTotal)}`" icon="banknotes" tone="green" />
      <StatCard label="Unpaid diary ledger" :value="formatCurrency(dash.diary.unpaidAmount)" :hint="`${dash.diary.unpaidCount} entries unpaid · ${dash.fuel.toleranceAlerts} fuel alerts`" icon="pencil-square" tone="amber" />
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <div class="rounded-2xl border border-line bg-surface p-5 shadow-sm lg:col-span-2">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-ink">Operational attention queue</h2>
            <p class="text-xs text-ink-faint">Exceptions requiring fleet controller, workshop or accounting follow-up.</p>
          </div>
          <BaseButton size="sm" variant="ghost" icon="arrow-path" :loading="loading" @click="load">Refresh</BaseButton>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <NuxtLink
            v-for="item in attentionItems"
            :key="item.label"
            :to="item.to"
            class="flex items-center justify-between rounded-xl border border-line bg-canvas/50 px-4 py-3 transition hover:border-primary/40"
          >
            <span class="text-xs font-medium text-ink-soft">{{ item.label }}</span>
            <span class="rounded-full px-2.5 py-0.5 text-xs font-bold tnum" :class="item.tone">{{ item.value }}</span>
          </NuxtLink>
        </div>

        <div class="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
          <div>
            <p class="text-[11px] uppercase tracking-wide text-ink-faint">Scheduled PM works</p>
            <p class="mt-1 text-lg font-semibold text-ink tnum">{{ dash.schedules.scheduledWorks }}</p>
            <p class="text-xs text-ink-faint">{{ dash.schedules.dueWithin7Days }} due within 7 days</p>
          </div>
          <div>
            <p class="text-[11px] uppercase tracking-wide text-ink-faint">Fuel posted (litres)</p>
            <p class="mt-1 text-lg font-semibold text-ink tnum">{{ Number(dash.fuel.litresPosted || 0).toLocaleString() }} L</p>
            <p class="text-xs text-ink-faint">{{ formatCurrency(dash.fuel.costPosted) }} across {{ dash.fuel.totalLogs }} logs</p>
          </div>
          <div>
            <p class="text-[11px] uppercase tracking-wide text-ink-faint">In workshop right now</p>
            <p class="mt-1 text-lg font-semibold text-ink tnum">{{ dash.fleet.inWorkshop }}</p>
            <p class="text-xs text-ink-faint">{{ dash.fleet.breakdown }} breakdown · {{ dash.fleet.stalledMeters }} stalled meters</p>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h2 class="text-sm font-semibold text-ink">Fleet status mix</h2>
        <p class="text-xs text-ink-faint">Active, workshop and breakdown distribution</p>
        <div class="mt-3 h-48">
          <SharedEChart :option="fleetChartOption" height="190px" />
        </div>
        <div class="mt-2 border-t border-line pt-3">
          <p class="mb-2 text-xs font-semibold text-ink-soft">Cross-module handoffs</p>
          <div v-if="dash.crossModuleLinks.length" class="space-y-1.5">
            <div v-for="(link, idx) in dash.crossModuleLinks" :key="idx" class="flex items-center justify-between text-xs">
              <span class="text-ink-soft">{{ humanLabel(link.targetModule) }}</span>
              <span class="rounded-full border px-2 py-0.5 text-[10px] font-semibold" :class="fleetStatusTone(link.handoffStatus)">
                {{ humanLabel(link.handoffStatus) }} ({{ link.count }})
              </span>
            </div>
          </div>
          <p v-else class="text-xs text-ink-faint">No Inventory, GL, SCM or AR/AP handoffs recorded yet.</p>
        </div>
      </div>
    </div>

    <div>
      <h2 class="mb-3 text-sm font-semibold text-ink">Workspaces</h2>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="link in links"
          :key="link.path"
          :to="link.path"
          class="rounded-2xl border border-line bg-surface p-4 transition hover:border-primary/50 hover:shadow-sm"
        >
          <div class="flex items-center gap-2.5">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <AppIcon :name="link.icon" :size="17" />
            </span>
            <span class="font-semibold text-ink">{{ link.title }}</span>
          </div>
          <p class="mt-2 text-xs leading-5 text-ink-faint">{{ link.description }}</p>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
