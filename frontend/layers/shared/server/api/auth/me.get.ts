import { currentTenantIdentity } from '../../utils/tenant-auth'
export default defineEventHandler(async (event) => {
  const { identity } = await currentTenantIdentity(event)
  return {
    authenticated: true, demo: false, id: identity.userId, accountId: identity.accountId,
    username: identity.username, name: identity.fullName || identity.username,
    email: identity.email, permissions: identity.permissions || [],
  }
})
