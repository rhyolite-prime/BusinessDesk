import QRCode from 'qrcode'
import { checkAuthOrigin, clearTenantSession, tenantAuthRequest, completeTenantLogin, authCookieOptions } from '../../utils/tenant-auth'
import { otpauthUrl } from '../../utils/totp'

export default defineEventHandler(async (event) => {
  checkAuthOrigin(event)
  const body = await readBody(event)
  if (!body || !['accountId', 'usernameOrEmail'].every(key => typeof body[key] === 'string' && body[key].trim()) || typeof body.password !== 'string' || !body.password) {
    throw createError({ statusCode: 400, statusMessage: 'Account ID, username/email and password are required.' })
  }
  clearTenantSession(event)
  const result = await tenantAuthRequest(event, 'tenant-login', {
    accountId: body.accountId.trim(), usernameOrEmail: body.usernameOrEmail.trim(), password: body.password,
  })
  if (result.requiresTwoFactorAuth === false && result.token) return completeTenantLogin(event, result)
  if (result.requiresTwoFactorAuth !== true || result.token || typeof result.challengeId !== 'string' || !/^[a-f0-9]{64}$/.test(result.challengeId) ||
      !Number.isFinite(result.expiresIn) || Number(result.expiresIn) <= 0 || typeof result.enrollmentRequired !== 'boolean') {
    throw createError({ statusCode: 503, statusMessage: 'Incomplete second-factor challenge.' })
  }
  const enrollment = result.enrollmentRequired
    ? await buildEnrollment(result.secret, result.issuer, result.accountLabel)
    : null
  setCookie(event, 'bd_challenge', result.challengeId, { ...authCookieOptions(event), maxAge: Math.min(Number(result.expiresIn), 300) })
  // JWT and challenge ID stay in httpOnly cookies, never in browser storage.
  return { authenticated: false, requiresTwoFactorAuth: true, expiresIn: result.expiresIn, enrollment }
})

async function buildEnrollment(secret?: string, issuer?: string, account?: string) {
  if (!secret || !/^[A-Z2-7]{32}$/.test(secret) || !issuer || !account) {
    throw createError({ statusCode: 503, statusMessage: 'Authenticator enrollment unavailable.' })
  }
  const uri = otpauthUrl(secret, issuer, account)
  return {
    secret, issuer, account,
    // Genuine locally encoded QR. Four-module quiet zone, no external QR service.
    qr: await QRCode.toDataURL(uri, { width: 320, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } }),
  }
}
