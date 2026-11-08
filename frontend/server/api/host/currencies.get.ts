import { currencyRequest } from '../../utils/currency-api'
export default defineEventHandler(event => {
  const q = getQuery(event)
  return currencyRequest(event, true, 'currencies', 'GET', { pageNo: q.pageNo || 1, pageSize: q.pageSize || 20, query: typeof q.query === 'string' ? q.query : '' })
})
