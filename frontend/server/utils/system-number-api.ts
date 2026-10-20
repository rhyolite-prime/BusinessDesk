import { createError, getQuery, getRouterParam, readBody, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { requireCurrencyHost } from './currency-api'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
export async function systemNumberRequest(event: H3Event, host: boolean, method: 'GET' | 'POST' | 'PUT' | 'DELETE', detail = false) {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const token = host ? (await requireCurrencyHost(event)).token : (await requireBusinessDeskSession(event)).accessToken
  if (!host && (method === 'POST' || method === 'DELETE')) throw createError({ statusCode: 403, statusMessage: 'Tenant copies can only be edited.' })
  const id = getRouterParam(event, 'id')
  if (detail && (!id || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))) throw createError({ statusCode: 400, statusMessage: 'Invalid system number ID.' })
  const config = useRuntimeConfig(event), base = String(config.ledgerApiBaseUrl || config.authApiBaseUrl || '').replace(/\/$/, '')
  if (!base) throw createError({ statusCode: 503, statusMessage: 'System number API is not configured.' })
  const q = getQuery(event), query = method === 'GET' && !detail ? { pageNo: q.pageNo || 1, pageSize: q.pageSize || 20, query: typeof q.query === 'string' ? q.query : '' } : undefined
  const body = method === 'POST' || method === 'PUT' ? await readBody(event) : undefined
  try {
    const r = await $fetch<{ success: boolean; result: any; error?: { code: string } }>(`${base}/api/v1/${host ? 'host' : 'shared'}/system-numbers${detail ? `/${id}` : ''}`, { method, body, query, retry: 0, timeout: 15000, headers: { authorization: `Bearer ${token}` } })
    if (!r.success) {
      const codes: Record<string, number> = { validation_error: 400, unauthorized: 401, forbidden: 403, not_found: 404, conflict: 409 }
      throw createError({ statusCode: codes[r.error?.code || ''] || 503 })
    }
    return r.result
  } catch (e: any) {
    const status = e?.response?.status || e?.statusCode
    const messages: Record<number, string> = { 400: 'Check the numbering fields and format tokens.', 401: 'Sign in again to continue.', 403: 'This operation is not permitted for your session.', 404: 'System number is no longer available.', 409: 'A system number with this module and key already exists.' }
    throw createError({ statusCode: messages[status] ? status : 503, statusMessage: messages[status] || 'System number service unavailable. Please retry.' })
  }
}
