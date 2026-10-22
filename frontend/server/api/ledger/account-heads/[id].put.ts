import { accountHeadRequest, headUuid, validateHeadBody } from '../../../utils/account-head-api'
export default defineEventHandler(async event => {
  const id = getRouterParam(event, 'id')
  if (!headUuid(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid account head.' })
  return accountHeadRequest(event, `account-heads/${id}`, 'PUT', undefined, validateHeadBody(await readBody(event)))
})
