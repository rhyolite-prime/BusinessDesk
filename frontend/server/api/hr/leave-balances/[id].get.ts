import { hrWorkflowRequest } from '../../../utils/hr-workflow-api'
export default defineEventHandler(event => hrWorkflowRequest(event, 'GET', 'balance'))
