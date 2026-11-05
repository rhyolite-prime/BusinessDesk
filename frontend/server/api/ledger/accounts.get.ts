import { headUuid } from '../../utils/account-head-api'
import { accountDetailRequest } from '../../utils/account-detail-api'
export default defineEventHandler(async event => {
  const query = getQuery(event)
  if (!headUuid(query.accountingUnitId)) throw createError({ statusCode: 400, statusMessage: 'Select an accounting unit.' })
  return accountDetailRequest(event, 'accounts', 'GET', { accountingUnitId: query.accountingUnitId, pageNo: query.pageNo || 1, pageSize: query.pageSize || 200, query: typeof query.query === 'string' ? query.query : '' })
})
