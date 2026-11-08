import { bankAccountRequest } from '../../../utils/bank-account-api'
export default defineEventHandler(event => bankAccountRequest(event, 'PUT', 'detail'))
