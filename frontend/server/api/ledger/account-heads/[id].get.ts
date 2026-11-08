import { accountHeadRequest, headUuid } from '../../../utils/account-head-api'
export default defineEventHandler(event => {
  const id = getRouterParam(event, 'id'), unit = getQuery(event).accountingUnitId
  if (!headUuid(id) || !headUuid(unit)) throw createError({ statusCode: 400, statusMessage: 'Invalid account head or accounting unit.' })
  return accountHeadRequest(event, `account-heads/${id}`, 'GET', { accountingUnitId: unit })
})
