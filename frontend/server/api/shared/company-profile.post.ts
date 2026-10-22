import { companyProfileRequest } from '../../utils/company-profile-api'
export default defineEventHandler(event => companyProfileRequest(event, 'POST'))
