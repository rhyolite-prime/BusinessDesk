import { filterDemoAccounts } from '../../utils/ledger-demo'
import { getLedgerResource } from '../../utils/ledger-api'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  return getLedgerResource(event, 'accounts', query, () => filterDemoAccounts(query))
})
