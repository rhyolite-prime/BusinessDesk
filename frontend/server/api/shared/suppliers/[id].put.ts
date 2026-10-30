import { supplierRequest } from '../../../utils/supplier-api'
export default defineEventHandler((event) =>
  supplierRequest(event, 'PUT', false, 'detail'),
)
