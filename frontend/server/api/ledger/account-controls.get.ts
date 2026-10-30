import { headUuid } from '../../utils/account-head-api'
import { accountControlRequest } from '../../utils/account-control-api'
export default defineEventHandler(async event => {
  const query = getQuery(event)
  if (!headUuid(query.accountingUnitId)) throw createError({ statusCode: 400, statusMessage: 'Select an accounting unit.' })
  return accountControlRequest(event, 'account-controls', 'GET', { accountingUnitId: query.accountingUnitId, pageNo: query.pageNo || 1, pageSize: query.pageSize || 200, query: typeof query.query === 'string' ? query.query : '' })
})
