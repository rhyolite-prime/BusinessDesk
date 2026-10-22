export const supplierTextFields = [
  { key: 'accountNumber', label: 'Account number', max: 80, required: true },
  { key: 'name', label: 'Name', max: 200, required: true },
  { key: 'email', label: 'Email', max: 254, type: 'email' },
  { key: 'phoneNo', label: 'Phone number', max: 50, type: 'tel' },
  { key: 'address', label: 'Address', max: 1000 },
  { key: 'contactPerson', label: 'Contact person', max: 160 },
  {
    key: 'contactPersonPhone',
    label: 'Contact person phone',
    max: 50,
    type: 'tel',
  },
  {
    key: 'contactPersonEmail',
    label: 'Contact person email',
    max: 254,
    type: 'email',
  },
  { key: 'tinNumber', label: 'TIN number', max: 80 },
  { key: 'vatNumber', label: 'VAT number', max: 80 },
  { key: 'taxOffice', label: 'Tax office', max: 160 },
] as const
export const supplierDecimalFields = [
  {
    key: 'buyingRate',
    label: 'Buying rate',
    pattern: '(0|[1-9][0-9]{0,9})(\\.[0-9]{1,10})?',
  },
  {
    key: 'sellingRate',
    label: 'Selling rate',
    pattern: '(0|[1-9][0-9]{0,9})(\\.[0-9]{1,10})?',
  },
  {
    key: 'creditLimit',
    label: 'Credit limit',
    pattern: '(0|[1-9][0-9]{0,13})(\\.[0-9]{1,6})?',
  },
] as const
export const supplierAccountFields = [
  {
    key: 'creditAccountId',
    name: 'creditAccountName',
    label: 'Credit GL account (AP liability)',
    kind: 'credits',
  },
  {
    key: 'debitAccountId',
    name: 'debitAccountName',
    label: 'Debit GL account',
    kind: 'accounts',
  },
  {
    key: 'vatAccountId',
    name: 'vatAccountName',
    label: 'VAT GL account',
    kind: 'accounts',
  },
  {
    key: 'irsAccountId',
    name: 'irsAccountName',
    label: 'IRS GL account',
    kind: 'accounts',
  },
] as const
export function blankSupplier() {
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
    taxOffice: '',
    supplierGroupId: '',
    statusId: 'active',
    currencyId: '',
    buyingRate: '1',
    sellingRate: '1',
    creditLimit: '0',
    creditAccountId: '',
    debitAccountId: '',
    vatAccountId: '',
    irsAccountId: '',
    isResident: true,
  }
}
export interface SupplierRecord extends ReturnType<typeof blankSupplier> {
  id: string
  version: number
  balance: string
  supplierGroupName: string
  statusName: string
  currencyName: string
  currencyCode: string
  creditAccountName: string
  debitAccountName: string
  vatAccountName: string
  irsAccountName: string
  accountingUnitId: string
  accountingUnitName: string
}
