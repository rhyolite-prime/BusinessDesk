import {
  createError,
  getQuery,
  getRouterParam,
  readBody,
  setHeader,
  type H3Event,
} from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
export async function employeeRequest(
  event: H3Event,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  mode: 'list' | 'detail' | 'options' = 'list',
) {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const { accessToken } = await requireBusinessDeskSession(event)
  const id = getRouterParam(event, 'id')
  if (
    mode === 'detail' &&
    (!id || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))
  )
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid employee ID.',
    })
  const config = useRuntimeConfig(event)
  const base = String(
    config.ledgerApiBaseUrl || config.authApiBaseUrl || '',
  ).replace(/\/$/, '')
  if (!base)
    throw createError({
      statusCode: 503,
      statusMessage: 'Employee API is not configured.',
    })
  const q = getQuery(event)
  try {
    const response = await $fetch<{
      success: boolean
      result: unknown
      error?: { code?: string; message?: string }
    }>(
      `${base}/api/v1/shared/employees${mode === 'detail' ? `/${id}` : mode === 'options' ? '/options' : ''}`,
      {
        method,
        retry: 0,
        timeout: 20000,
        headers: { authorization: `Bearer ${accessToken}` },
        query:
          method === 'GET' && mode !== 'detail'
            ? {
                pageNo: q.pageNo || 1,
                pageSize: q.pageSize || 20,
                query: q.query || '',
              }
            : undefined,
        body: method !== 'GET' ? await readBody(event) : undefined,
      },
    )
    if (!response.success)
      throw createError({
        statusCode:
          (
            {
              validation_error: 400,
              unauthorized: 401,
              forbidden: 403,
              not_found: 404,
              conflict: 409,
            } as Record<string, number>
          )[response.error?.code || ''] || 503,
        data: response,
      })
    return response.result
  } catch (error: unknown) {
    const e = error as {
      response?: { status?: number }
      statusCode?: number
      data?: {
        error?: { message?: string }
        data?: { error?: { message?: string } }
      }
    }
    const status = e.response?.status || e.statusCode || 503
    const messages: Record<number, string> = {
      400: 'Check employee fields, date values and decimal precision.',
      401: 'Sign in again to continue.',
      403: 'Employee biodata access requires a tenant administrator or employee permissions.',
      404: 'Employee no longer available.',
      409: 'Employee changed, identifier is reserved, linked user is already assigned, or a live voucher/imprest prevents this change. Reload and retry.',
    }
    // Only validated application messages may cross the BFF; never upstream DB errors.
    const safeDetail =
      status === 400
        ? e.data?.error?.message || e.data?.data?.error?.message
        : undefined
    throw createError({
      statusCode: messages[status] ? status : 503,
      statusMessage:
        safeDetail ||
        messages[status] ||
        'Employee service unavailable. Verify migration 019_employee_biodata.sql is installed.',
    })
  }
}
