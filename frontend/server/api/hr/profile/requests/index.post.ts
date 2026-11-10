import { hrProfileRequest } from '../../../../utils/hr-profile-api'
export default defineEventHandler(event => hrProfileRequest(event, 'POST', 'list'))
