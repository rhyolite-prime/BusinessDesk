import { accountingUnitRequest, unitId } from '../../../utils/accounting-unit-api'
export default defineEventHandler(event => accountingUnitRequest(event, `accounting-units/${unitId(getRouterParam(event, 'id'))}`))
