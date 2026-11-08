import { bankRequest } from '../../../../../utils/bank-api'
export default defineEventHandler(event => bankRequest(event, 'PUT', true, true))
