import { systemNumberRequest } from '../../../utils/system-number-api'
export default defineEventHandler(event => systemNumberRequest(event, false, 'POST', false))
