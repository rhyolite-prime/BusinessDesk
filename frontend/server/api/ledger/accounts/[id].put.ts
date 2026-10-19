import { headUuid } from '../../../utils/account-head-api'
import { accountDetailRequest, validateAccountDetailBody } from '../../../utils/account-detail-api'
export default defineEventHandler(async event => {
  const id = getRouterParam(event, 'id')
  if (!headUuid(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid account detail.' })
  return accountDetailRequest(event, `accounts/${id}`, 'PUT', undefined, validateAccountDetailBody(await readBody(event)))
})
