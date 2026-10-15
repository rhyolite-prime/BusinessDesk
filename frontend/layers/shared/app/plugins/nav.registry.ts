export default defineNuxtPlugin(() => {
  const { register, addItem } = useNavigation()

  register('finance', { label: 'Finance', icon: 'banknotes', order: 1 })
  addItem('finance', { label: 'General Ledger', to: '/ledger', icon: 'book-open' })
  addItem('finance', { label: 'Accounts Payable', to: '/modules/accounts-payable', icon: 'document-text' })
  addItem('finance', { label: 'Accounts Receivable', to: '/modules/accounts-receivable', icon: 'wallet' })
  addItem('finance', { label: 'Fixed Assets', to: '/modules/fixed-assets', icon: 'cube' })

  register('operations', { label: 'Operations', icon: 'cube', order: 2 })
  addItem('operations', { label: 'Inventory', to: '/modules/inventory', icon: 'cube' })
  addItem('operations', { label: 'Supply Chain', to: '/modules/supply-chain', icon: 'arrow-path' })
  addItem('operations', { label: 'Manufacturing', to: '/modules/manufacturing', icon: 'building-office' })
  addItem('operations', { label: 'Point of Sale', to: '/modules/point-of-sale', icon: 'credit-card' })
  addItem('operations', { label: 'Customer Relationship Management', to: '/modules/customer-relationship-management', icon: 'users' })
  addItem('operations', { label: 'Project Management', to: '/modules/project-management', icon: 'list-bullet' })
  addItem('operations', { label: 'Document Management', to: '/modules/document-management', icon: 'document-text' })
  addItem('operations', { label: 'Print Intelligence', to: '/modules/print-intelligence', icon: 'list-bullet' })

  register('people', { label: 'People & education', icon: 'users', order: 3 })
  addItem('people', { label: 'Human Resources', to: '/modules/human-resource', icon: 'identification' })
  addItem('people', { label: 'Payroll', to: '/payroll', icon: 'banknotes' })
  addItem('people', { label: 'School Information System', to: '/modules/school-information-system', icon: 'document-text' })

  register('industry', { label: 'Industry solutions', icon: 'home', order: 4 })
  addItem('industry', { label: 'Property Rentals', to: '/modules/property-rentals', icon: 'home' })
})
