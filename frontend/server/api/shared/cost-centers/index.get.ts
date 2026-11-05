import { costCenterRequest } from '../../../utils/cost-center-api'
export default defineEventHandler(event => costCenterRequest(event, 'GET', false))
