import { filterDemoJournals } from '../../utils/ledger-demo'
import { getLedgerResource } from '../../utils/ledger-api'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  return getLedgerResource(event, 'journals', query, () => filterDemoJournals(query))
})
