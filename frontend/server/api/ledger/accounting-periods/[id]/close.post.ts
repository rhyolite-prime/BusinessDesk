import { accountingPeriodRequest } from '../../../../utils/accounting-period-api'
export default defineEventHandler(event => accountingPeriodRequest(event, 'close'))
