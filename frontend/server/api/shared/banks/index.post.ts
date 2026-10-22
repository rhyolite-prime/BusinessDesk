import { bankRequest } from '../../../utils/bank-api'
export default defineEventHandler(event => bankRequest(event, 'POST', false, false))
