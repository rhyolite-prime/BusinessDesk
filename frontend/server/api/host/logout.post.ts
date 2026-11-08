import { checkAuthOrigin } from '../../../layers/shared/server/utils/tenant-auth'
export default defineEventHandler(event => {
  checkAuthOrigin(event)
  deleteCookie(event, 'bd_host_access', { path: '/' })
  return { authenticated: false }
})
