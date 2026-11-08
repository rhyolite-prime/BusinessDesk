import { accountingUnitRequest } from '../../utils/accounting-unit-api'
export default defineEventHandler(event => {
  const query = getQuery(event)
  return accountingUnitRequest(event, 'accounting-units', 'GET', { pageNo: query.pageNo || 1, pageSize: query.pageSize || 20, query: typeof query.query === 'string' ? query.query : '' })
})
