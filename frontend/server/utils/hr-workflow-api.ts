import { createError, getQuery, getRouterParam, readBody, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
const uuid = (s: string) => /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(s)
export async function hrWorkflowRequest(event: H3Event, method: 'GET' | 'POST' | 'PUT', mode: 'list' | 'item' | 'transition' | 'balance') {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const { accessToken } = await requireBusinessDeskSession(event)
  const kind = getRouterParam(event, 'kind') || ''
  const id = getRouterParam(event, 'id') || ''
  if (mode !== 'balance' && !['vacancy', 'candidate', 'onboarding', 'review'].includes(kind)) throw createError({ statusCode: 404, statusMessage: 'Unknown HR workflow.' })
  if (mode !== 'list' && !uuid(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid record ID.' })
  const config = useRuntimeConfig(event)
  const base = String(config.ledgerApiBaseUrl || config.authApiBaseUrl || '').replace(/\/$/, '')
  if (!base) throw createError({ statusCode: 503, statusMessage: 'HR API is not configured.' })
  const path = mode === 'balance' ? `/api/v1/hr/leave-balances/${id}` : `/api/v1/hr/work-items/${kind}${mode === 'item' || mode === 'transition' ? `/${id}` : ''}${mode === 'transition' ? '/transition' : ''}`
  try {
    const response = await $fetch<{ success: boolean; result: unknown }>(`${base}${path}`, {
      method, body: method !== 'GET' ? await readBody(event) : undefined,
      query: method === 'GET' ? getQuery(event) : undefined,
      headers: { authorization: `Bearer ${accessToken}` }, timeout: 20000, retry: 0,
    })
    if (!response.success) throw createError({ statusCode: 503, statusMessage: 'HR request failed.' })
    return response.result
  } catch (error: any) {
    const status = error?.response?.status || error?.statusCode || 503
    const messages: Record<number, string> = { 400: 'Check the required fields, dates and values.', 401: 'Sign in again to continue.', 403: 'HR access requires a tenant administrator or HR permissions.', 404: 'Employee or record not found.', 409: 'The record changed, is closed, or the employee is unavailable. Refresh and retry.' }
    throw createError({ statusCode: messages[status] ? status : 503, statusMessage: messages[status] || 'HR service unavailable. Verify the HR migrations are installed.' })
  }
}
