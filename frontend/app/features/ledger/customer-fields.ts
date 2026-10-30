import { supplierTextFields, supplierDecimalFields } from './supplier-fields'
export const customerTextFields = [
  ...supplierTextFields.filter((f) => f.key !== 'taxOffice'),
  { key: 'status', label: 'Status description', max: 80 },
  { key: 'statusId', label: 'Legacy status UUID (optional)', max: 36 },
] as const
export const customerDecimalFields = supplierDecimalFields
export const customerAccountFields = [
  {
    key: 'receivableAccountId',
    name: 'receivableAccountName',
    label: 'Receivable G/L',
    kind: 'accounts',
  },
  {
    key: 'creditAccountId',
    name: 'creditAccountName',
    label: 'Credit GL account (optional)',
    kind: 'accounts',
  },
  {
    key: 'vatAccountId',
    name: 'vatAccountName',
    label: 'VAT GL account (optional)',
    kind: 'accounts',
  },
  {
    key: 'irsAccountId',
    name: 'irsAccountName',
    label: 'IRS GL account (optional)',
    kind: 'accounts',
  },
] as const
export function blankCustomer() {
  return {
    accountNumber: '',
    name: '',
    email: '',
    phoneNo: '',
    address: '',
    contactPerson: '',
    contactPersonPhone: '',
    contactPersonEmail: '',
    tinNumber: '',
    vatNumber: '',
    status: '',
    statusId: '',
    customerGroupId: '',
    currencyId: '',
    creditLimit: '0',
    accountingUnitId: '',
    receivableAccountId: '',
    creditAccountId: '',
    vatAccountId: '',
    irsAccountId: '',
    isActive: true,
  }
}
export interface CustomerRecord extends ReturnType<typeof blankCustomer> {
  id: string
  version: number
  balance: string
  customerGroupName: string
  currencyName: string
  currencyCode: string
  accountingUnitName: string
  receivableAccountName: string
  creditAccountName: string
  vatAccountName: string
  irsAccountName: string
}
