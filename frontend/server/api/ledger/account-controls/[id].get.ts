import { headUuid } from '../../../utils/account-head-api'
import { accountControlRequest } from '../../../utils/account-control-api'
export default defineEventHandler(event => {
  const id = getRouterParam(event, 'id'), unit = getQuery(event).accountingUnitId
  if (!headUuid(id) || !headUuid(unit)) throw createError({ statusCode: 400, statusMessage: 'Invalid account control or accounting unit.' })
  return accountControlRequest(event, `account-controls/${id}`, 'GET', { accountingUnitId: unit })
})
