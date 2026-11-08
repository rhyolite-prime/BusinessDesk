import { headUuid } from '../../../utils/account-head-api'
import { accountDetailRequest } from '../../../utils/account-detail-api'
export default defineEventHandler(event => {
  const id = getRouterParam(event, 'id'), unit = getQuery(event).accountingUnitId
  if (!headUuid(id) || !headUuid(unit)) throw createError({ statusCode: 400, statusMessage: 'Invalid account detail or accounting unit.' })
  return accountDetailRequest(event, `accounts/${id}`, 'DELETE', { accountingUnitId: unit })
})
