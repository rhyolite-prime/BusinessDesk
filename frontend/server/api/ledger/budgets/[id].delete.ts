import { budgetRequest } from '../../../utils/budget-api'
export default defineEventHandler(event => budgetRequest(event, 'DELETE', 'detail'))
