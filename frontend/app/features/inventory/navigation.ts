// Sidebar, topbar and search definitions for the Inventory workspace. Every
// route rendered under /inventory must be listed here so the sidebar highlights
// it and the topbar shows its title.

export interface ModuleNavLink {
  label: string
  to?: string
  icon: string
  comingSoon?: boolean
}

export interface ModuleNavGroup {
  title: string
  icon: string
  links: ModuleNavLink[]
}

export interface ModulePageDefinition {
  path: string
  title: string
  description: string
  icon: string
}

export const inventoryPages: ModulePageDefinition[] = [
  { path: '/inventory', title: 'Inventory overview', description: 'Stock value, document activity and period health for the selected accounting unit.', icon: 'home' },
  { path: '/inventory/items', title: 'Items', description: 'Catalogue of stock, service and kit items with costing, tracking and reorder rules.', icon: 'cube' },
  { path: '/inventory/warehouses', title: 'Warehouses', description: 'Physical, transit and virtual locations that hold stock for the unit.', icon: 'building-office' },
  { path: '/inventory/bin-locations', title: 'Bin locations', description: 'Bins and zones inside each warehouse, used for put-away and transfers.', icon: 'map-pin' },
  { path: '/inventory/stock', title: 'Stock balances', description: 'On-hand quantities and values by item, warehouse and batch.', icon: 'scale' },
  { path: '/inventory/ledger', title: 'Stock ledger', description: 'Immutable stock transactions with running balances.', icon: 'arrow-path' },
  { path: '/inventory/documents', title: 'Stock documents', description: 'Receipts, issues, transfers, adjustments and counts with approval and posting.', icon: 'document-text' },
  { path: '/inventory/traceability', title: 'Batches & serials', description: 'Traced batch and serial records with quality and expiry tracking.', icon: 'tag' },
  { path: '/inventory/catalog', title: 'Units & categories', description: 'Units of measure and the item category hierarchy.', icon: 'list-bullet' },
  { path: '/inventory/item-settings', title: 'Item settings', description: 'Per-warehouse planning, supplier sourcing and unit conversions for each item.', icon: 'cog-6-tooth' },
  { path: '/inventory/valuation', title: 'Valuation & period close', description: 'Valuation snapshots and inventory period closes.', icon: 'calendar-days' },
]

export const inventoryNavigationGroups: ModuleNavGroup[] = [
  {
    title: 'Stock',
    icon: 'cube',
    links: [
      { label: 'Items', to: '/inventory/items', icon: 'cube' },
      { label: 'Warehouses', to: '/inventory/warehouses', icon: 'building-office' },
      { label: 'Bin locations', to: '/inventory/bin-locations', icon: 'map-pin' },
      { label: 'Stock balances', to: '/inventory/stock', icon: 'scale' },
      { label: 'Stock ledger', to: '/inventory/ledger', icon: 'arrow-path' },
    ],
  },
  {
    title: 'Movements',
    icon: 'document-text',
    links: [{ label: 'Stock documents', to: '/inventory/documents', icon: 'document-text' }],
  },
  {
    title: 'Traceability',
    icon: 'tag',
    links: [{ label: 'Batches & serials', to: '/inventory/traceability', icon: 'tag' }],
  },
  {
    title: 'Setup',
    icon: 'cog-6-tooth',
    links: [
      { label: 'Units & categories', to: '/inventory/catalog', icon: 'list-bullet' },
      { label: 'Item settings', to: '/inventory/item-settings', icon: 'cog-6-tooth' },
    ],
  },
  {
    title: 'Valuation',
    icon: 'calendar-days',
    links: [{ label: 'Snapshots & period close', to: '/inventory/valuation', icon: 'calendar-days' }],
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

/** Longest matching definition wins so nested routes resolve to their own title. */
export function inventoryPageByPath(path: string): ModulePageDefinition | undefined {
  return inventoryPages
    .filter((page) => path === page.path || path.startsWith(`${page.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]
}

export const inventorySearchItems = inventoryPages
  .filter((page) => page.path !== '/inventory')
  .map((page) => ({ label: page.title, detail: page.description, to: page.path }))
