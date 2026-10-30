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
import { headUuid } from './account-head-api'
export async function accountingPeriodRequest(
  event: H3Event,
  operation: 'list' | 'create' | 'open' | 'close' | 'history',
) {
  setHeader(event, 'Cache-Control', 'no-store')
  const write = ['create', 'open', 'close'].includes(operation)
  if (write) checkAuthOrigin(event)
  const { accessToken } = await requireBusinessDeskSession(event)
  const query = getQuery(event),
    id = getRouterParam(event, 'id')
  const body = write ? await readBody(event) : undefined
  const unit = write ? body?.accountingUnitId : query.accountingUnitId
  if (
    !headUuid(unit) ||
    (['open', 'close', 'history'].includes(operation) && !headUuid(id)) ||
    (query.accountingUnitId !== undefined && query.accountingUnitId !== unit)
  )
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid accounting unit and period IDs are required.',
    })
  const config = useRuntimeConfig(event),
    base = String(
      config.ledgerApiBaseUrl || config.authApiBaseUrl || '',
    ).replace(/\/$/, '')
  if (!base)
    throw createError({
      statusCode: 503,
      statusMessage: 'Accounting period API is not configured.',
    })
  try {
    const result = await $fetch<{
      success: boolean
      result: unknown
      error?: { code: string; message?: string }
    }>(
      `${base}/api/v1/ledger/accounting-periods${['open', 'close', 'history'].includes(operation) ? `/${id}/${operation}` : ''}`,
      {
        method: write ? 'POST' : 'GET',
        body,
        query: {
          accountingUnitId: unit,
          ...(operation === 'list' && query.year !== undefined
            ? { year: query.year }
            : {}),
        },
        retry: 0,
        timeout: 15000,
        headers: { authorization: `Bearer ${accessToken}` },
      },
    )
    if (!result.success)
      throw createError({ statusCode: 503, data: { error: result.error } })
    return result.result
  } catch (error: any) {
    const code = error?.data?.error?.code || error?.response?._data?.error?.code
    if (code === 'schema_not_ready')
      throw createError({
        statusCode: 503,
        statusMessage:
          'Apply migration 013_accounting_period_management.sql to manage accounting periods.',
      })
    const byCode: Record<string, number> = {
      validation_error: 400,
      unauthorized: 401,
      forbidden: 403,
      not_found: 404,
      conflict: 409,
    }
    const status = byCode[code] || error?.response?.status || error?.statusCode
    const messages: Record<number, string> = {
      400: 'Check the period code (YYYYMM), real ordered dates, current version and a reason of 1–500 bytes. Status and audit fields cannot be supplied.',
      401: 'Sign in again to continue.',
      403: 'This operation is not permitted.',
      404: 'The live accounting unit or period was not found.',
      409: 'Period changed, is locked, has overlapping dates, or its code already exists. Refresh and review existing periods.',
    }
    throw createError({
      statusCode: messages[status] ? status : 503,
      statusMessage:
        messages[status] ||
        'Accounting period service unavailable. Please retry.',
    })
  }
}
