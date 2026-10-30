import { financialReportRequest } from '../../../utils/financial-report-api'
export default defineEventHandler(event=>financialReportRequest(event))
