import { journalRequest } from '../../../utils/journal-api'
export default defineEventHandler(event => journalRequest(event, 'PUT', 'detail'))
