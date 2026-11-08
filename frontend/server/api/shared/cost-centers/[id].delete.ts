import { costCenterRequest } from '../../../utils/cost-center-api'
export default defineEventHandler(event => costCenterRequest(event, 'DELETE', true))
