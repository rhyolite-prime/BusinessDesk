import { employeeRequest } from '../../../utils/employee-api'
export default defineEventHandler((event) =>
  employeeRequest(event, 'GET', 'list'),
)
