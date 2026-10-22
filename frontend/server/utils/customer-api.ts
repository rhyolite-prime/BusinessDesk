import {
  createError,
  getHeader,
  getQuery,
  getRouterParam,
  readBody,
  setHeader,
  type H3Event,
} from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
import { headUuid } from './account-head-api'
export async function customerRequest(
  event: H3Event,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  mode: 'list' | 'detail' = 'list',
) {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const session = await requireBusinessDeskSession(event)
  if (session.demo || !session.accessToken)
    throw createError({
      statusCode: 403,
      statusMessage: 'Live tenant sign-in is required for customers.',
    })
  const id = getRouterParam(event, 'id'),
    query = getQuery(event)
  if (mode !== 'list' && !headUuid(id))
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid customer ID required.',
    })
  const config = useRuntimeConfig(event),
    base = String(
      config.ledgerApiBaseUrl || config.authApiBaseUrl || '',
    ).replace(/\/$/, '')
  if (!base)
    throw createError({
      statusCode: 503,
      statusMessage: 'Customer API is not configured.',
    })
  const body = method !== 'GET' ? await readBody(event) : undefined
  const suffix = mode === 'list' ? '' : `/${id}`
  try {
    const r = await $fetch<{
      success: boolean
      result: unknown
      error?: { code: string; message: string }
    }>(`${base}/api/v1/shared/customers${suffix}`, {
      method,
      body,
      query,
      retry: 0,
      timeout: 70000,
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID(),
      },
    })
    if (!r.success)
      throw createError({ statusCode: 503, data: { error: r.error } })
    return r.result
  } catch (e: any) {
    const err = e?.data?.error || e?.response?._data?.error
    const codes: Record<string, number> = {
      validation_error: 400,
      unauthorized: 401,
      forbidden: 403,
      not_found: 404,
      conflict: 409,
      approval_required: 409,
    }
    const code = String(err?.code || '')
    throw createError({
      statusCode: codes[code] || 503,
      statusMessage: codes[code]
        ? String(err?.message || 'Customer action failed.')
        : code === 'schema_not_ready'
          ? 'Customer database upgrade required. Apply migration 020 and its prerequisites.'
          : 'Customer service unavailable. Reload before retrying customer changes.',
      data: { code },
    })
  }
}
