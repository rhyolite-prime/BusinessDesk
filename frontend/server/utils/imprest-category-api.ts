import {
  createError,
  getRouterParam,
  getQuery,
  readBody,
  setHeader,
  type H3Event,
} from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
export async function imprestCategoryRequest(
  event: H3Event,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  detail = false,
) {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const { accessToken } = await requireBusinessDeskSession(event)
  const id = getRouterParam(event, 'id')
  if (
    detail &&
    (!id || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))
  )
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid imprest category ID.',
    })
  const config = useRuntimeConfig(event),
    base = String(
      config.ledgerApiBaseUrl || config.authApiBaseUrl || '',
    ).replace(/\/$/, '')
  if (!base)
    throw createError({
      statusCode: 503,
      statusMessage: 'Imprest category API is not configured.',
    })
  const body = method !== 'GET' ? await readBody(event) : undefined
  try {
    const r = await $fetch<{
      success: boolean
      result: any
      error?: { code: string }
    }>(`${base}/api/v1/ledger/imprest-categories${detail ? `/${id}` : ''}`, {
      method,
      body,
      query:
        method === 'GET' && !detail
          ? { accountingUnitId: getQuery(event).accountingUnitId || '' }
          : undefined,
      retry: 0,
      timeout: 15000,
      headers: { authorization: `Bearer ${accessToken}` },
    })
    if (!r.success) {
      const codes: Record<string, number> = {
        validation_error: 400,
        unauthorized: 401,
        forbidden: 403,
        not_found: 404,
        conflict: 409,
      }
      throw createError({ statusCode: codes[r.error?.code || ''] || 503 })
    }
    return r.result
  } catch (e: any) {
    const status = e?.response?.status || e?.statusCode
    const messages: Record<number, string> = {
      400: 'Enter a category name, accounting unit and current version.',
      401: 'Sign in again to continue.',
      403: 'Tenant access required.',
      404: 'Imprest category is no longer available.',
      409: 'Category changed, the name already exists, or a financial reference prevents deletion.',
    }
    throw createError({
      statusCode: messages[status] ? status : 503,
      statusMessage:
        messages[status] ||
        'Imprest category service unavailable. Please retry.',
    })
  }
}
