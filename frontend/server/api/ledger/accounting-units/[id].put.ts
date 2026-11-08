import { accountingUnitRequest, unitId, validateUnitBody } from '../../../utils/accounting-unit-api'
export default defineEventHandler(async event => accountingUnitRequest(event, `accounting-units/${unitId(getRouterParam(event, 'id'))}`, 'PUT', undefined, validateUnitBody(await readBody(event))))
