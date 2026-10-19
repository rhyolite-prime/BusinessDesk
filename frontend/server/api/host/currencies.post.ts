import { currencyRequest, currencyBody } from '../../utils/currency-api'
export default defineEventHandler(async event => currencyRequest(event, true, 'currencies', 'POST', undefined, currencyBody(await readBody(event))))
