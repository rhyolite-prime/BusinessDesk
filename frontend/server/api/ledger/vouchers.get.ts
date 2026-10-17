import { filterDemoVouchers } from '../../utils/ledger-voucher-demo'
import { getLedgerResource } from '../../utils/ledger-api'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  return getLedgerResource(event, 'vouchers', query, () => filterDemoVouchers(query))
})
