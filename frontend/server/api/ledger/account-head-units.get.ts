import { accountHeadRequest } from '../../utils/account-head-api'
export default defineEventHandler(event => accountHeadRequest(event, 'account-head-units'))
