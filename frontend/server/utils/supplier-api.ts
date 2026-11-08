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
  mode: 'list' | 'detail' | 'options' | 'next-number' = 'list',
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
    method === 'GET' && (mode === 'list' || mode === 'options')
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
    method !== 'GET' ? await readBody(event) : undefined
  try {
    const r = await $fetch<{
      success: boolean
      result: any
      error?: { code?: string }
    }>(
      `${base}/api/v1/shared/${group ? 'supplier-groups' : 'suppliers'}${mode === 'detail' ? `/${id}` : mode === 'options' ? '/options' : mode === 'next-number' ? '/next-number' : ''}`,
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
    if (mode === 'next-number' && (typeof r.result?.accountNumber !== 'string' || !r.result.accountNumber.trim() || r.result.accountNumber.length > 80))
      throw createError({ statusCode: 502 })
    return r.result
  } catch (e: any) {
    const status = e?.response?.status || e?.statusCode
    const code = e?.response?._data?.error?.code || e?.data?.error?.code || e?.data?.data?.error?.code
    // Add supplier performs a GET before any form fields exist. Older backends
    // may match /next-number as /{id} and return 400 for a non-UUID ID. Never
    // report that as a supplier-field validation problem or invent a number.
    if (mode === 'next-number' && code !== 'supplier_numbering' && code !== 'schema_not_ready' && status !== 401 && status !== 403) {
      const unsupported = [400, 404, 405, 501].includes(status)
      throw createError({
        statusCode: 503,
        statusMessage: unsupported
          ? 'Supplier account-number preview was rejected by the backend. Rebuild and restart the C++ backend with the latest SupplierController and SupplierService, and verify GET /api/v1/shared/suppliers/next-number reaches the preview endpoint. No supplier fields have been submitted.'
          : 'Unable to load the next supplier account number from the backend. Verify the supplier preview service is running, then retry Add supplier. No supplier fields have been submitted.',
      })
    }
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
        code === 'supplier_numbering'
          ? 'Check the tenant System numbers entry supplier-account-id: exactly one live entry is required, with a valid format, an available next number and an account number no longer than 80 characters.'
          : code === 'schema_not_ready'
          ? 'Apply migrations through 023_drop_customer_supplier_rates.sql to enable supplier configuration.'
          : messages[status] || 'Supplier service unavailable. Please retry.',
    })
  }
}
