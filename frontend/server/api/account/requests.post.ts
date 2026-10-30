import { tenantAccountRequest } from '../../utils/tenant-account-api'
export default defineEventHandler(event => tenantAccountRequest(event, false, 'POST', 'requests'))
