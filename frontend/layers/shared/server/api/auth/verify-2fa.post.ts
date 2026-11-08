import { checkAuthOrigin, tenantAuthRequest, completeTenantLogin } from '../../utils/tenant-auth'
export default defineEventHandler(async (event) => {
  checkAuthOrigin(event)
  const challenge = getCookie(event, 'bd_challenge')
  const body = await readBody(event)
  if (!challenge) throw createError({ statusCode: 401, statusMessage: 'Login challenge expired. Sign in again.' })
  if (!body || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter the six-digit authenticator code.' })
  }
  const result = await tenantAuthRequest(event, 'tenant-verify-totp', { challengeId: challenge, code: body.code })
  if (result.requiresTwoFactorAuth !== true) throw createError({ statusCode: 503, statusMessage: 'Incomplete verification response.' })
  return completeTenantLogin(event, result)
})
