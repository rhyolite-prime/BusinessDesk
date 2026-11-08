import { customerRequest } from '../../utils/customer-api'
export default defineEventHandler((event) =>
  customerRequest(event, 'POST', 'list', true),
)
