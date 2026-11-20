import { ledgerDashboardRequest } from '../../utils/ledger-dashboard-api'

export default defineEventHandler(event => ledgerDashboardRequest(event))
