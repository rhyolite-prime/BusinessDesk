export const accountModules = {
  gl: 'General Ledger',
  payroll: 'Payroll',
  school_manager: 'School Manager',
  ap: 'Accounts Payable',
  ar: 'Accounts Receivable',
  fixed_assets: 'Fixed Assets',
  human_resource: 'Human Resources',
  inventory: 'Inventory',
  manufacturing: 'Manufacturing',
  point_of_sale: 'Point of Sale',
  core_banking: 'Core Banking',
  supply_chain: 'Supply Chain',
  property_rentals: 'Property Rentals',
  document_management: 'Document Management',
} as const
export type AccountModule = keyof typeof accountModules
export interface ModuleSubscription {
  enabled: boolean
  startDate: string | null
  endDate: string | null
  fee: string
  billingCycle: string
  nextRenewalDate: string | null
  effective: boolean
}
export interface AccountRequest {
  id: string
  message: string
  response: string
  status: string
  version: number
  createdAt: string
}
export interface TenantAccount {
  id: string
  accountId: string
  name: string
  country: string
  isActive: boolean
  requireTwoFactorAuth: boolean
  version: number
  createdAt: string
  updatedAt: string
  modules: Record<AccountModule, ModuleSubscription>
  billing: {
    currencyId: string | null
    currencyCode?: string | null
    email: string
    phone: string
    paymentMethod: string
  }
  requests: AccountRequest[]
  audit?: Array<{
    id: string
    action: string
    actorUserId: string
    createdAt: string
    previous: unknown
    state: unknown
  }>
}
export const workspaceSubscriptions: Record<string, AccountModule> = {
  'general-ledger': 'gl',
  payroll: 'payroll',
  'school-information-system': 'school_manager',
  'accounts-payable': 'ap',
  'accounts-receivable': 'ar',
  'fixed-assets': 'fixed_assets',
  'human-resource': 'human_resource',
  inventory: 'inventory',
  manufacturing: 'manufacturing',
  'point-of-sale': 'point_of_sale',
  'supply-chain': 'supply_chain',
  'property-rentals': 'property_rentals',
  'document-management': 'document_management',
}
export function accountUpdate(account: TenantAccount) {
  return {
    version: account.version,
    name: account.name,
    country: account.country,
    isActive: account.isActive,
    requireTwoFactorAuth: account.requireTwoFactorAuth,
    billing: {
      currencyId: account.billing.currencyId,
      email: account.billing.email,
      phone: account.billing.phone,
      paymentMethod: account.billing.paymentMethod,
    },
    modules: Object.fromEntries(
      Object.entries(account.modules).map(([key, { effective, ...value }]) => [
        key,
        value,
      ]),
    ),
  }
}
