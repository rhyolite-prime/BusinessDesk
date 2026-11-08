import { demoDashboard } from '../../utils/ledger-demo'
import { getLedgerResource } from '../../utils/ledger-api'

export default defineEventHandler((event) =>
  getLedgerResource(event, 'dashboard', {}, () => demoDashboard),
)
