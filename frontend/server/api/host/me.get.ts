import { requireCurrencyHost } from '../../utils/currency-api'
export default defineEventHandler(async event => ({ authenticated: true, ...(await requireCurrencyHost(event)).identity }))
