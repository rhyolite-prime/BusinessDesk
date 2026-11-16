// Sidebar, topbar and search definitions for Fleet & Workshop Management.
// Every route rendered under /fleet-workshop is listed here so the sidebar
// highlights it and the topbar shows its title.
import type { ModuleNavGroup, ModulePageDefinition } from '../inventory/navigation'

export const fleetPages: ModulePageDefinition[] = [
  {
    path: '/fleet-workshop',
    title: 'Fleet & workshop overview',
    description: 'Fleet readiness, maintenance due, fuel alerts, unpaid diary notes and cross-module handoffs.',
    icon: 'home',
  },
  {
    path: '/fleet-workshop/vehicles',
    title: 'Asset register',
    description: 'Fleet vehicles, heavy equipment, PM triggers, coupled trailers and Fixed Assets sync.',
    icon: 'cube',
  },
  {
    path: '/fleet-workshop/asset-groups',
    title: 'Asset groups & BOMs',
    description: 'Equipment models, default PM triggers, minor/major service materials and required components.',
    icon: 'list-bullet',
  },
  {
    path: '/fleet-workshop/procedures',
    title: 'Procedure library',
    description: 'Standard PCode maintenance checklists and service procedures.',
    icon: 'document-text',
  },
  {
    path: '/fleet-workshop/employees',
    title: 'Workshop staff',
    description: 'Mechanics, electricians, welders and tyre technicians linked to HR with hourly rates.',
    icon: 'users',
  },
  {
    path: '/fleet-workshop/meters',
    title: 'Meters & stalled alerts',
    description: 'Daily odometer and engine-hour logs, meter replacements and stalled-meter resolution.',
    icon: 'clock',
  },
  {
    path: '/fleet-workshop/fuel-lubs',
    title: 'Fuel & lubricants',
    description: 'Fuel logs, tolerance variance alerts, lubricant/oil changes and Inventory/GL posting.',
    icon: 'arrow-path',
  },
  {
    path: '/fleet-workshop/components-tyres',
    title: 'Components & tyres',
    description: 'Serialized major components and tyre lifecycle tracking across vehicles and axles.',
    icon: 'cog-6-tooth',
  },
  {
    path: '/fleet-workshop/schedules',
    title: 'Maintenance schedules',
    description: 'Heavy machinery & light vehicle PM forecasts, breakdowns, job creation and SCM requisitions.',
    icon: 'calendar-days',
  },
  {
    path: '/fleet-workshop/diary',
    title: 'Workshop diary ledger',
    description: 'Field repair notes, payment status, multi-vehicle splits and promotion into Job Cards.',
    icon: 'pencil-square',
  },
  {
    path: '/fleet-workshop/job-cards',
    title: 'Job cards & projects',
    description: 'Work orders, parts & labour costing, project milestones, Inventory/GL/AR/AP/POS handoffs.',
    icon: 'document-text',
  },
  {
    path: '/fleet-workshop/reports',
    title: 'Fleet & workshop reports',
    description: 'Forecast, fuel & lubricants, jobs, tyres, major components and meter reports with exports.',
    icon: 'chart-bar-square',
  },
  {
    path: '/fleet-workshop/settings',
    title: 'GL setup & handoff queue',
    description: 'Unit GL accounts, default warehouse, rates and cross-module integration history.',
    icon: 'building-library',
  },
]

export const fleetNavigationGroups: ModuleNavGroup[] = [
  {
    title: 'Fleet & setup',
    icon: 'cube',
    links: [
      { label: 'Asset register', to: '/fleet-workshop/vehicles', icon: 'cube' },
      { label: 'Asset groups & BOMs', to: '/fleet-workshop/asset-groups', icon: 'list-bullet' },
      { label: 'Procedure library', to: '/fleet-workshop/procedures', icon: 'document-text' },
      { label: 'Workshop staff', to: '/fleet-workshop/employees', icon: 'users' },
    ],
  },
  {
    title: 'Telemetry & consumables',
    icon: 'clock',
    links: [
      { label: 'Meters & stalled alerts', to: '/fleet-workshop/meters', icon: 'clock' },
      { label: 'Fuel & lubricants', to: '/fleet-workshop/fuel-lubs', icon: 'arrow-path' },
      { label: 'Components & tyres', to: '/fleet-workshop/components-tyres', icon: 'cog-6-tooth' },
    ],
  },
  {
    title: 'Workshop & scheduling',
    icon: 'calendar-days',
    links: [
      { label: 'Maintenance schedules', to: '/fleet-workshop/schedules', icon: 'calendar-days' },
      { label: 'Workshop diary ledger', to: '/fleet-workshop/diary', icon: 'pencil-square' },
      { label: 'Job cards & projects', to: '/fleet-workshop/job-cards', icon: 'document-text' },
    ],
  },
  {
    title: 'Reports & accounting',
    icon: 'chart-bar-square',
    links: [
      { label: 'Reports', to: '/fleet-workshop/reports', icon: 'chart-bar-square' },
      { label: 'GL setup & handoffs', to: '/fleet-workshop/settings', icon: 'building-library' },
    ],
  },
  {
    title: 'Account',
    icon: 'user',
    links: [
      { label: 'Preferences', to: '/preferences', icon: 'cog-6-tooth' },
      { label: 'Account & subscription', to: '/account', icon: 'building-office' },
    ],
  },
]

export function fleetPageByPath(path: string): ModulePageDefinition | undefined {
  return fleetPages
    .filter((page) => path === page.path || path.startsWith(`${page.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]
}

export const fleetSearchItems = fleetPages
  .filter((page) => page.path !== '/fleet-workshop')
  .map((page) => ({ label: page.title, detail: page.description, to: page.path }))
