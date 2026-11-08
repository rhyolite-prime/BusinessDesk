import type { H3Event } from 'h3'
import { currentTenantIdentity } from '../../layers/shared/server/utils/tenant-auth'
/** Validate against the backend, including live account/tenant status and MFA. */
export async function requireBusinessDeskSession(event: H3Event) {
  const { identity, accessToken } = await currentTenantIdentity(event)
  return { userId: identity.userId!, username: identity.username!, demo: false, accessToken }
}
