import { bankRequest } from '../../../../../utils/bank-api'
export default defineEventHandler(event => bankRequest(event, 'DELETE', true, true))
