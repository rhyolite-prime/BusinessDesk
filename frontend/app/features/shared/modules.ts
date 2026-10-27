// Mirrors business_desk::Modules in constants/BusinessDeskConsts.h.
export enum Modules {
  GeneralLedger = 1,
  SchoolInformationSystem = 2,
  Payroll = 3,
  PrintIntelligence = 4,
  AccountsPayable = 5,
  AccountsReceivable = 6,
  FixedAssets = 7,
  PointOfSale = 8,
  HumanResource = 9,
  Inventory = 10,
  SupplyChain = 11,
  Manufacturing = 12,
  DocumentManagement = 13,
  PropertyRentals = 14,
  CustomerRelationshipManagement = 15,
  ProjectManagement = 16,
}
export const moduleOptions = Object.entries(Modules)
  .filter(([, value]) => typeof value === 'number')
  .map(([name, value]) => ({ value: value as Modules, label: name.replace(/([a-z])([A-Z])/g, '$1 $2') }))
export const isKnownModule = (value: number) => moduleOptions.some(option => option.value === value)

export const moduleLabel = (value: number): string => moduleOptions.find(option => option.value === value)?.label ?? `Unknown module (${value})`

/** Resolve module selections to explicit template IDs for the selective sync API. */
export const templateIdsForModules = (templates: readonly { id: string; moduleId: number }[], modules: readonly number[]): string[] =>
  templates.filter(template => modules.includes(template.moduleId)).map(template => template.id)
