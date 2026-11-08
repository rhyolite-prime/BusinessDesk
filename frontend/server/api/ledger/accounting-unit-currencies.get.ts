import { accountingUnitRequest } from '../../utils/accounting-unit-api'
export default defineEventHandler(event => accountingUnitRequest(event, 'accounting-unit-currencies'))
