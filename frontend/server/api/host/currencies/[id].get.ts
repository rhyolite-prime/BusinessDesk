import { currencyRequest } from '../../../utils/currency-api'
import { headUuid } from '../../../utils/account-head-api'
export default defineEventHandler(async event => {
  const id = getRouterParam(event, 'id')
  if (!headUuid(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid currency UUID.' })
  return currencyRequest(event, true, `currencies/${id}`, 'GET')
})
