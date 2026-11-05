import { accountControlRequest, validateControlBody } from '../../utils/account-control-api'
export default defineEventHandler(async event => accountControlRequest(event, 'account-controls', 'POST', undefined, validateControlBody(await readBody(event))))
