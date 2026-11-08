import {
  createError,
  getCookie,
  getQuery,
  getRouterParam,
  readBody,
  setHeader,
  type H3Event,
} from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
import { headUuid } from './account-head-api'
export async function tenantAccountRequest(
  event: H3Event,
  host: boolean,
  method: 'GET' | 'PUT' | 'POST',
  operation = '',
) {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const token = host
    ? getCookie(event, 'bd_host_access')
    : (await requireBusinessDeskSession(event)).accessToken
  if (!token)
    throw createError({
      statusCode: 401,
      statusMessage: 'Sign in to the appropriate account first.',
    })
  const id = getRouterParam(event, 'id')
  if (host && id && !headUuid(id))
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid tenant ID required.',
    })
  const config = useRuntimeConfig(event),
    base = String(
      config.ledgerApiBaseUrl || config.authApiBaseUrl || '',
    ).replace(/\/$/, '')
  if (!base)
    throw createError({
      statusCode: 503,
      statusMessage: 'Account API is not configured.',
    })
  const path = host
    ? `host/tenant-accounts${id ? `/${id}` : ''}${operation ? `/${operation}` : ''}`
    : `account${operation ? `/${operation}` : ''}`
  try {
    const r = await $fetch<{
      success: boolean
      result: unknown
      error?: { code: string; message: string }
    }>(`${base}/api/v1/${path}`, {
      method,
      body: method === 'GET' ? undefined : await readBody(event),
      query: host && !id ? { search: getQuery(event).search || '' } : undefined,
      headers: { authorization: `Bearer ${token}` },
      retry: 0,
      timeout: 20000,
    })
    if (!r.success) throw createError({ data: { error: r.error } })
    return r.result
  } catch (e: any) {
    const error = e?.data?.error || e?.response?._data?.error
    const status =
      (
        {
          validation_error: 400,
          unauthorized: 401,
          forbidden: 403,
          not_found: 404,
          conflict: 409,
        } as Record<string, number>
      )[error?.code] || (e?.response?.status === 401 ? 401 : 503)
    throw createError({
      statusCode: status,
      statusMessage:
        error?.code === 'schema_not_ready'
          ? 'Account database upgrade required: apply migration 018.'
          : status === 503
            ? 'Account service unavailable. No fallback data has been used.'
            : String(error?.message || 'Account request denied.'),
      data: { code: error?.code },
    })
  }
}
