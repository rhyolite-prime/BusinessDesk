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
export async function supplierVoucherRequest(
  event: H3Event,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  mode: 'list' | 'detail' | 'preview' | 'submit' | 'approve' | 'post' = 'list',
) {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const session = await requireBusinessDeskSession(event)
  if (session.demo || !session.accessToken)
    throw createError({
      statusCode: 403,
      statusMessage: 'Live tenant sign-in is required for vouchers.',
    })
  const id = getRouterParam(event, 'id'),
    query = getQuery(event)
  if (!['list', 'preview'].includes(mode) && !headUuid(id))
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid voucher ID required.',
    })
  const config = useRuntimeConfig(event),
    base = String(
      config.ledgerApiBaseUrl || config.authApiBaseUrl || '',
    ).replace(/\/$/, '')
  if (!base)
    throw createError({
      statusCode: 503,
      statusMessage: 'Voucher API is not configured.',
    })
  const body =
    method === 'POST' || method === 'PUT' ? await readBody(event) : undefined
  const suffix =
    mode === 'list'
      ? ''
      : mode === 'preview'
        ? '/preview'
        : `/${id}${mode === 'detail' ? '' : `/${mode}`}`
  try {
    const r = await $fetch<{
      success: boolean
      result: unknown
      error?: { code: string; message: string }
    }>(`${base}/api/v1/ledger/vouchers${suffix}`, {
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
        ? String(err?.message || 'Voucher action failed.')
        : code === 'schema_not_ready'
          ? 'Voucher database upgrade required. Apply migration 017 and its prerequisites.'
          : 'Voucher service unavailable. Retry with the same request; posting retries cannot duplicate balances.',
      data: { code },
    })
  }
}
