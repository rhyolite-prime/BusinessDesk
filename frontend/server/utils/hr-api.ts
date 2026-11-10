import { createError, getQuery, getRouterParam, readBody, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'

export async function hrRequest(event: H3Event, method: 'GET' | 'POST', action = false) {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const { accessToken } = await requireBusinessDeskSession(event)
  const id = getRouterParam(event, 'id') || ''
  const operation = getRouterParam(event, 'action') || ''
  if (action && (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id) || !['approve', 'reject', 'cancel'].includes(operation)))
    throw createError({ statusCode: 400, statusMessage: 'Invalid request or action.' })
  const config = useRuntimeConfig(event)
  const base = String(config.ledgerApiBaseUrl || config.authApiBaseUrl || '').replace(/\/$/, '')
  if (!base) throw createError({ statusCode: 503, statusMessage: 'HR API is not configured.' })
  const body = method === 'POST' ? await readBody(event) : undefined
  try {
    const response = await $fetch<{ success: boolean; result: unknown; error?: { code?: string; message?: string } }>(`${base}/api/v1/hr/leave-requests${action ? `/${id}/${operation}` : ''}`, {
      method, body, query: method === 'GET' ? getQuery(event) : undefined,
      headers: { authorization: `Bearer ${accessToken}` }, timeout: 20000, retry: 0,
    })
    if (!response.success) throw createError({ statusCode: 503, statusMessage: 'HR request failed.' })
    return response.result
  } catch (error: any) {
    const status = error?.response?.status || error?.statusCode || 503
    const messages: Record<number, string> = {
      400: 'Check the employee, dates and request details.',
      401: 'Sign in again to continue.',
      403: 'HR access requires a tenant administrator or HR permissions.',
      404: 'Employee or request not found.',
      409: 'This request has changed or is no longer pending. Refresh and retry.',
    }
    throw createError({ statusCode: messages[status] ? status : 503, statusMessage: messages[status] || 'HR service unavailable. Verify migration 036 is installed.' })
  }
}
