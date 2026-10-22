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

export async function supplierRequest(
  event: H3Event,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  group = false,
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
      statusMessage: 'Invalid supplier record ID.',
    })
  const config = useRuntimeConfig(event)
  const base = String(
    config.ledgerApiBaseUrl || config.authApiBaseUrl || '',
  ).replace(/\/$/, '')
  if (!base)
    throw createError({
      statusCode: 503,
      statusMessage: 'Supplier API is not configured.',
    })
  const q = getQuery(event)
  const query =
    method === 'GET' && mode !== 'detail'
      ? {
          pageNo: q.pageNo || 1,
          pageSize: q.pageSize || 20,
          query: q.query || '',
          ...(mode === 'options'
            ? {
                kind: q.kind || 'groups',
                accountingUnitId: q.accountingUnitId || '',
              }
            : {}),
        }
      : undefined
  const body =
    method === 'POST' || method === 'PUT' ? await readBody(event) : undefined
  try {
    const r = await $fetch<{
      success: boolean
      result: any
      error?: { code?: string }
    }>(
      `${base}/api/v1/shared/${group ? 'supplier-groups' : 'suppliers'}${mode === 'detail' ? `/${id}` : mode === 'options' ? '/options' : ''}`,
      {
        method,
        query,
        body,
        retry: 0,
        timeout: 20000,
        headers: { authorization: `Bearer ${accessToken}` },
      },
    )
    if (!r.success)
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
          )[r.error?.code || ''] || 503,
        data: r,
      })
    return r.result
  } catch (e: any) {
    const status = e?.response?.status || e?.statusCode
    const code = e?.data?.error?.code || e?.data?.data?.error?.code
    const messages: Record<number, string> = {
      400: 'Check required fields, email and decimal precision. Use live groups, active currency and GL accounts from one unit; the credit account must be a liability.',
      401: 'Sign in again to continue.',
      403: 'A live tenant account is required.',
      404: 'This supplier record is no longer available.',
      409: 'The record changed, the name/account number is reserved, or a balance or supplier reference prevents this change. Refresh and try again.',
    }
    throw createError({
      statusCode: messages[status] ? status : 503,
      statusMessage:
        code === 'schema_not_ready'
          ? 'Apply migration 016_suppliers.sql to enable supplier configuration.'
          : messages[status] || 'Supplier service unavailable. Please retry.',
    })
  }
}
