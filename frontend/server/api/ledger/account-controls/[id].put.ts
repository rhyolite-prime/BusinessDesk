import { headUuid } from '../../../utils/account-head-api'
import { accountControlRequest, validateControlBody } from '../../../utils/account-control-api'
export default defineEventHandler(async event => {
  const id = getRouterParam(event, 'id')
  if (!headUuid(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid account control.' })
  return accountControlRequest(event, `account-controls/${id}`, 'PUT', undefined, validateControlBody(await readBody(event)))
})
