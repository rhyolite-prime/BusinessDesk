import { requireBusinessDeskSession } from '../../../utils/auth'
import { checkAuthOrigin } from '../../../../layers/shared/server/utils/tenant-auth'
export default defineEventHandler(async event=>{
 setHeader(event,'Cache-Control','no-store')
 checkAuthOrigin(event)
 await requireBusinessDeskSession(event)
 throw createError({statusCode:410,statusMessage:'Reports now use AccountType. Financial report mappings are no longer used.'})
})
