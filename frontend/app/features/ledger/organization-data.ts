export interface LedgerOrganizationalUnit {
  id: string
  name: string
  path: string
}

export const ledgerOrganizationalUnits: LedgerOrganizationalUnit[] = [
  { id: 'ou-accra', name: 'Accra Operations', path: 'Head Office / Accra Operations' },
  { id: 'ou-finance', name: 'Finance & Administration', path: 'Head Office / Finance & Administration' },
  { id: 'ou-operations', name: 'Operations', path: 'Head Office / Operations' },
  { id: 'ou-sales', name: 'Sales & Marketing', path: 'Head Office / Sales & Marketing' },
  { id: 'ou-kumasi', name: 'Kumasi Branch', path: 'Kumasi Branch' },
  { id: 'ou-cbs', name: 'Central Business School', path: 'Central Business School' },
]
