// Sidebar, topbar and search definitions for the Supply Chain workspace.
import type { ModuleNavGroup, ModulePageDefinition } from '../inventory/navigation'

export const supplyChainPages: ModulePageDefinition[] = [
  { path: '/supply-chain', title: 'Supply chain', description: 'Requisitions, purchase orders and goods receipts, connected to the stock ledger.', icon: 'home' },
  { path: '/supply-chain?tab=requisitions', title: 'Purchase requisitions', description: 'Internal demand: draft, submit, approve and convert into purchase orders.', icon: 'document-text' },
  { path: '/supply-chain?tab=orders', title: 'Purchase orders', description: 'Supplier commitments with currency-resolved totals, approval and dispatch.', icon: 'credit-card' },
  { path: '/supply-chain?tab=receipts', title: 'Goods receipts', description: 'Inbound deliveries posted to the stock ledger and the general ledger.', icon: 'arrow-path' },
]

export const supplyChainNavigationGroups: ModuleNavGroup[] = [
  {
    title: 'Procure to pay',
    icon: 'document-text',
    links: [
      { label: 'Overview', to: '/supply-chain', icon: 'home' },
      { label: 'Purchase requisitions', to: '/supply-chain?tab=requisitions', icon: 'document-text' },
      { label: 'Purchase orders', to: '/supply-chain?tab=orders', icon: 'credit-card' },
      { label: 'Goods receipts', to: '/supply-chain?tab=receipts', icon: 'arrow-path' },
    ],
  },
  {
    title: 'Stock',
    icon: 'cube',
    links: [{ label: 'Inventory items', to: '/inventory/items', icon: 'cube' }],
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

export function supplyChainPageByPath(path: string): ModulePageDefinition | undefined {
  // Tabs share one route, so the title comes from the overview entry.
  return supplyChainPages.find((page) => page.path === path.split('?')[0])
}

export const supplyChainSearchItems = supplyChainPages
  .filter((page) => page.path !== '/supply-chain')
  .map((page) => ({ label: page.title, detail: page.description, to: page.path }))
