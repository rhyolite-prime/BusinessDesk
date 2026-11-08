import { checkAuthOrigin, authCookieOptions } from '../../../layers/shared/server/utils/tenant-auth'
import { currencyUpstream } from '../../utils/currency-api'
export default defineEventHandler(async event => {
  checkAuthOrigin(event)
  deleteCookie(event, 'bd_host_access', { path: '/' })
  const body = await readBody(event)
  if (!body || typeof body.usernameOrEmail !== 'string' || !body.usernameOrEmail.trim() || typeof body.password !== 'string' || !body.password) throw createError({ statusCode: 400, statusMessage: 'Username/email and password are required.' })
  const base = String(useRuntimeConfig(event).authApiBaseUrl || '').replace(/\/$/, '')
  if (!base) throw createError({ statusCode: 503, statusMessage: 'Host authentication API is not configured.' })
  let result: { token?: string; expiresIn?: number }
  try {
    const r = await $fetch<{ success: boolean; result: typeof result }>(`${base}/api/v1/auth/host-login`, { method: 'POST', body: { usernameOrEmail: body.usernameOrEmail.trim(), password: body.password }, retry: 0, timeout: 15000 })
    if (!r.success) throw createError({ statusCode: 401 })
    result = r.result
  } catch (e: any) {
    const status = e?.response?.status || e?.statusCode
    throw createError({ statusCode: status === 400 || status === 401 ? 401 : 503, statusMessage: status === 400 || status === 401 ? 'Invalid host credentials.' : 'Host authentication service unavailable.' })
  }
  if (!result?.token || !Number.isFinite(result.expiresIn) || Number(result.expiresIn) <= 0) throw createError({ statusCode: 503, statusMessage: 'Incomplete host authentication response.' })
  // Validate host-admin privilege before storing the token, not a client role flag.
  const identity = await currencyUpstream(event, 'host/currency-session', result.token)
  if (identity?.canManageCurrencies !== true) throw createError({ statusCode: 403, statusMessage: 'Host administrator access required.' })
  setCookie(event, 'bd_host_access', result.token, { ...authCookieOptions(event), maxAge: Math.min(Number(result.expiresIn), 86400) })
  return { authenticated: true }
})
