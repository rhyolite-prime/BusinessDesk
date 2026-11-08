import { createError, getCookie, getHeader, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
export async function currencyUpstream(event: H3Event, path: string, token: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', query?: Record<string, unknown>, body?: Record<string, unknown>) {
  setHeader(event, 'Cache-Control', 'no-store')
  const base = String(useRuntimeConfig(event).ledgerApiBaseUrl || useRuntimeConfig(event).authApiBaseUrl || '').replace(/\/$/, '')
  if (!base) throw createError({ statusCode: 503, statusMessage: 'Currency API is not configured.' })
  try {
    const r = await $fetch<{ success: boolean; result: any; error?: { code: string } }>(`${base}/api/v1/${path}`, { method, query, body, retry: 0, timeout: 15000, headers: { authorization: `Bearer ${token}`, 'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID() } })
    if (!r.success) {
      const codes: Record<string, number> = { validation_error: 400, unauthorized: 401, forbidden: 403, not_found: 404, conflict: 409 }
      throw createError({ statusCode: codes[r.error?.code || ''] || 503 })
    }
    return r.result
  } catch (e: any) {
    const status = e?.response?.status || e?.statusCode
    const messages: Record<number, string> = { 400: 'Check currency code, name, precision and status.', 401: 'Sign in again to continue.', 403: 'Only host administrators can manage the shared currency catalog.', 404: 'Currency is no longer available.', 409: 'The code is reserved, or financial references prevent this change.' }
    throw createError({ statusCode: messages[status] ? status : 503, statusMessage: messages[status] || 'Currency service unavailable. Please retry.' })
  }
}
export async function requireCurrencyHost(event: H3Event) {
  const token = getCookie(event, 'bd_host_access')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Host sign-in is required.' })
  const identity = await currencyUpstream(event, 'host/currency-session', token)
  if (identity?.canManageCurrencies !== true) throw createError({ statusCode: 403, statusMessage: 'Host administrator access required.' })
  return { token, identity }
}
export async function currencyRequest(event: H3Event, host: boolean, resource: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', query?: Record<string, unknown>, body?: Record<string, unknown>) {
  if (method !== 'GET') checkAuthOrigin(event)
  const token = host ? (await requireCurrencyHost(event)).token : (await requireBusinessDeskSession(event)).accessToken
  return currencyUpstream(event, `${host ? 'host' : 'shared'}/${resource}`, token, method, query, body)
}
export function currencyBody(body: unknown): Record<string, unknown> {
  const r = body as Record<string, unknown>, allowed = new Set(['code', 'name', 'decimalPlaces', 'isActive'])
  if (!r || typeof r !== 'object' || Array.isArray(r) || Object.keys(r).some(k => !allowed.has(k)) || typeof r.code !== 'string' || !/^[a-z]{3}$/i.test(r.code.trim()) || typeof r.name !== 'string' || !r.name.trim() || r.name.trim().length > 100 || !Number.isInteger(r.decimalPlaces) || Number(r.decimalPlaces) < 0 || Number(r.decimalPlaces) > 6 || typeof r.isActive !== 'boolean') throw createError({ statusCode: 400, statusMessage: 'Enter a three-letter currency code, name, precision (0–6) and boolean status.' })
  return { code: r.code.trim().toUpperCase(), name: r.name.trim(), decimalPlaces: r.decimalPlaces, isActive: r.isActive }
}
