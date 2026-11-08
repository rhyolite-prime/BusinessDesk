import { accountingUnitRequest, validateUnitBody } from '../../utils/accounting-unit-api'
export default defineEventHandler(async event => accountingUnitRequest(event, 'accounting-units', 'POST', undefined, validateUnitBody(await readBody(event))))
