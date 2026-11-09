import { hrRequest } from '../../../utils/hr-api'
export default defineEventHandler((event) => hrRequest(event, 'GET'))
