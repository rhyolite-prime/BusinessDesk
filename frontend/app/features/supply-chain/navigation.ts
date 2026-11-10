// Sidebar, topbar and search definitions for the Supply Chain workspace.
import type { ModuleNavGroup, ModulePageDefinition } from '../inventory/navigation'

export const supplyChainPages: ModulePageDefinition[] = [
  { path: '/supply-chain', title: 'Supply chain', description: 'Procurement status, approval queues and inbound delivery activity.', icon: 'home' },
  { path: '/supply-chain/operations?tab=requisitions', title: 'Purchase requisitions', description: 'Internal demand: draft, submit, approve and convert into purchase orders.', icon: 'document-text' },
  { path: '/supply-chain/operations?tab=orders', title: 'Purchase orders', description: 'Supplier commitments with currency-resolved totals, approval and dispatch.', icon: 'credit-card' },
  { path: '/supply-chain/operations?tab=receipts', title: 'Goods receipts', description: 'Inbound deliveries posted to the stock ledger and the general ledger.', icon: 'arrow-path' },
]

export const supplyChainNavigationGroups: ModuleNavGroup[] = [
  {
    title: 'Procure to pay',
    icon: 'document-text',
    links: [
      { label: 'Overview', to: '/supply-chain', icon: 'home' },
      { label: 'Purchase requisitions', to: '/supply-chain/operations?tab=requisitions', icon: 'document-text' },
      { label: 'Purchase orders', to: '/supply-chain/operations?tab=orders', icon: 'credit-card' },
      { label: 'Goods receipts', to: '/supply-chain/operations?tab=receipts', icon: 'arrow-path' },
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

export function supplyChainPageByPath(path: string, tab?: unknown): ModulePageDefinition | undefined {
  if (path === '/supply-chain/operations') {
    const requestedTab = ['requisitions', 'orders', 'receipts'].includes(String(tab)) ? String(tab) : 'requisitions'
    return supplyChainPages.find((page) => page.path === `/supply-chain/operations?tab=${requestedTab}`)
  }
  return supplyChainPages.find((page) => page.path === path)
}

export const supplyChainSearchItems = supplyChainPages
  .filter((page) => page.path !== '/supply-chain')
  .map((page) => ({ label: page.title, detail: page.description, to: page.path }))
