import { accountDetailRequest, validateAccountDetailBody } from '../../utils/account-detail-api'
export default defineEventHandler(async event => accountDetailRequest(event, 'accounts', 'POST', undefined, validateAccountDetailBody(await readBody(event))))
