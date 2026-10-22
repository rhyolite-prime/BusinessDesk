import { createError, getCookie, getHeader, getRequestURL, setCookie, deleteCookie, setHeader, type H3Event } from 'h3'

export interface TenantAuthResult {
  token?: string
  expiresIn?: number
  requiresTwoFactorAuth?: boolean
  challengeId?: string
  enrollmentRequired?: boolean
  secret?: string
  issuer?: string
  accountLabel?: string
  userId?: string
  username?: string
  email?: string
  fullName?: string
  tenantId?: string
  accountId?: string
  permissions?: string[]
}

export function privateAuthResponse(event: H3Event) {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Pragma', 'no-cache')
}

export function checkAuthOrigin(event: H3Event) {
  privateAuthResponse(event)
  const origin = getHeader(event, 'origin')
  if (getHeader(event, 'sec-fetch-site') === 'cross-site' || (origin && origin !== getRequestURL(event).origin)) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-origin authentication is not allowed.' })
  }
}

export async function tenantAuthRequest(event: H3Event, path: string, body?: Record<string, unknown>, token?: string): Promise<TenantAuthResult> {
  privateAuthResponse(event)
  const base = String(useRuntimeConfig(event).authApiBaseUrl || '').replace(/\/$/, '')
  if (!base) throw createError({ statusCode: 503, statusMessage: 'Tenant authentication API is not configured.' })
  try {
    const response = await $fetch<{ success: boolean; result?: TenantAuthResult }>(`${base}/api/v1/auth/${path}`, {
      method: body ? 'POST' : 'GET', body,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      timeout: 15000,
      retry: 0, // Never replay a consumed second-factor challenge on an upstream error.
    })
    if (!response.success || !response.result) throw new Error('Invalid authentication response')
    return response.result
  } catch (error: any) {
    const status = error?.response?.status
    throw createError({
      statusCode: status === 401 || status === 400 ? 401 : 503,
      statusMessage: status === 401 || status === 400
        ? (path === 'tenant-login' ? 'Invalid account credentials. Please try again.' : 'Invalid or expired authenticator challenge/code. Please try again or sign in again.')
        : 'Authentication service unavailable. Please try again later.',
    })
  }
}

export function authCookieOptions(event: H3Event) {
  return { httpOnly: true, sameSite: 'strict' as const, secure: process.env.NODE_ENV === 'production' || getRequestURL(event).protocol === 'https:', path: '/' }
}

export function clearTenantSession(event: H3Event) {
  for (const name of ['bd_access', 'bd_challenge', 'tl_session', 'tl_authed']) deleteCookie(event, name, { path: '/' })
}

export function completeTenantLogin(event: H3Event, result: TenantAuthResult) {
  if (typeof result.token !== 'string' || !result.token || !Number.isFinite(result.expiresIn) || Number(result.expiresIn) <= 0) {
    throw createError({ statusCode: 503, statusMessage: 'Incomplete authentication response.' })
  }
  const maxAge = Math.min(Number(result.expiresIn), 86400)
  deleteCookie(event, 'bd_challenge', { path: '/' })
  setCookie(event, 'bd_access', result.token, { ...authCookieOptions(event), maxAge })
  // Non-credential hint for the client guard. /auth/me always validates the JWT.
  setCookie(event, 'tl_authed', '1', { ...authCookieOptions(event), httpOnly: false, maxAge })
  return { authenticated: true }
}

export async function currentTenantIdentity(event: H3Event) {
  privateAuthResponse(event)
  const token = getCookie(event, 'bd_access')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Sign in is required.' })
  return { identity: await tenantAuthRequest(event, 'me', undefined, token), accessToken: token }
}
