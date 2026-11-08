import { customerRequest } from '../../../utils/customer-api'
export default defineEventHandler((event) =>
  customerRequest(event, 'DELETE', 'detail', true),
)
