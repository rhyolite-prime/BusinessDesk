import { createError, getQuery, getRouterParam, readBody, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'

export async function hrProfileRequest(event: H3Event, method: 'GET' | 'POST', mode: 'employee' | 'list' | 'decision') {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const { accessToken } = await requireBusinessDeskSession(event)
  const id = getRouterParam(event, 'id') || '', action = getRouterParam(event, 'action') || ''
  if ((mode === 'employee' || mode === 'decision') && (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id) || (mode === 'decision' && !['approve', 'reject'].includes(action))))
    throw createError({ statusCode: 400, statusMessage: 'Invalid request or decision.' })
  const config = useRuntimeConfig(event)
  const base = String(config.ledgerApiBaseUrl || config.authApiBaseUrl || '').replace(/\/$/, '')
  if (!base) throw createError({ statusCode: 503, statusMessage: 'HR API is not configured.' })
  const path = mode === 'employee' ? `/api/v1/hr/profile/employees/${id}` : `/api/v1/hr/profile/requests${mode === 'decision' ? `/${id}/${action}` : ''}`
  try {
    const response = await $fetch<{ success: boolean; result: unknown }>(`${base}${path}`, {
      method, body: method === 'POST' ? await readBody(event) : undefined,
      query: method === 'GET' && mode === 'list' ? getQuery(event) : undefined,
      headers: { authorization: `Bearer ${accessToken}` }, timeout: 20000, retry: 0,
    })
    if (!response.success) throw createError({ statusCode: 503, statusMessage: 'Profile service unavailable.' })
    return response.result
  } catch (error: any) {
    const status = error?.response?.status || error?.statusCode || 503
    const messages: Record<number, string> = {
      400: 'Check the contact fields and request details.',
      401: 'Sign in again to continue.',
      403: 'Administrative profile access is required, or your HR subscription is inactive.',
      404: mode === 'employee' ? 'Employee not found in this tenant.' : 'Request not found.',
      409: 'The request or employee record changed, or another request is pending. Refresh and contact HR if needed.',
    }
    throw createError({ statusCode: messages[status] ? status : 503, statusMessage: messages[status] || 'Profile service unavailable. Verify migrations 038 and 039 are installed.' })
  }
}
