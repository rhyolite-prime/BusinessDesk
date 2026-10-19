import { currentTenantIdentity } from '../../utils/tenant-auth'
export default defineEventHandler(async (event) => {
  const { identity } = await currentTenantIdentity(event)
  return { id: identity.userId, username: identity.username, email: identity.email, accountId: identity.accountId }
})
