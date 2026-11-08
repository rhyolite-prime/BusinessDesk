import { createError, getHeader, getQuery, getRouterParam, readBody, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
export async function bankRequest(event: H3Event, method: 'GET' | 'POST' | 'PUT' | 'DELETE', branch = false, detail = false) {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const { accessToken } = await requireBusinessDeskSession(event)
  const uuid = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
  const bankId = getRouterParam(event, 'bankId'), id = getRouterParam(event, branch ? 'id' : 'bankId')
  if ((branch && (!bankId || !uuid.test(bankId))) || (detail && (!id || !uuid.test(id)))) throw createError({ statusCode: 400, statusMessage: 'Invalid bank or branch ID.' })
  const path = `shared/banks${branch ? `/${bankId}/branches` : ''}${detail ? `/${id}` : ''}`
  const config = useRuntimeConfig(event)
  const base = String(config.ledgerApiBaseUrl || config.authApiBaseUrl || '').replace(/\/$/, '')
  if (!base) throw createError({ statusCode: 503, statusMessage: 'Bank API is not configured.' })
  const q = getQuery(event)
  const query = method === 'GET' && !detail ? { pageNo: q.pageNo || 1, pageSize: q.pageSize || 20, query: typeof q.query === 'string' ? q.query : '' } : undefined
  const body = method === 'POST' || method === 'PUT' ? await readBody(event) : undefined
  try {
    const r = await $fetch<{ success: boolean; result: any; error?: { code: string } }>(`${base}/api/v1/${path}`, { method, query, body, retry: 0, timeout: 15000, headers: { authorization: `Bearer ${accessToken}`, 'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID() } })
    if (!r.success) {
      const codes: Record<string, number> = { validation_error: 400, unauthorized: 401, forbidden: 403, not_found: 404, conflict: 409 }
      throw createError({ statusCode: codes[r.error?.code || ''] || 503 })
    }
    return r.result
  } catch (e: any) {
    const status = e?.response?.status || e?.statusCode
    const messages: Record<number, string> = { 400: 'Check the name, bank code, contact details and email.', 401: 'Sign in again to continue.', 403: 'You cannot access this bank.', 404: 'Bank or branch is no longer available.', 409: 'This bank code is already in use.' }
    throw createError({ statusCode: messages[status] ? status : 503, statusMessage: messages[status] || 'Bank service unavailable. Please retry.' })
  }
}
