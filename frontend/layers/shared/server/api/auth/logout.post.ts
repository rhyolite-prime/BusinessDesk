import { checkAuthOrigin, clearTenantSession } from '../../utils/tenant-auth'
export default defineEventHandler((event) => {
  checkAuthOrigin(event)
  clearTenantSession(event)
  return { ok: true }
})
