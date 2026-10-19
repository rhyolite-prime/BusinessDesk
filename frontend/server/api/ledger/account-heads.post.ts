import { accountHeadRequest, validateHeadBody } from '../../utils/account-head-api'
export default defineEventHandler(async event => accountHeadRequest(event, 'account-heads', 'POST', undefined, validateHeadBody(await readBody(event))))
