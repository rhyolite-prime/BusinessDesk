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
export async function journalRequest(
  event: H3Event,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  mode:
    | 'list'
    | 'detail'
    | 'options'
    | 'validate'
    | 'next-number'
    | 'post' = 'list',
) {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const { accessToken } = await requireBusinessDeskSession(event)
  const id = getRouterParam(event, 'id'),
    query = getQuery(event)
  const body =
    method === 'POST' || method === 'PUT' ? await readBody(event) : undefined
  const unit = body?.accountingUnitId ?? query.accountingUnitId
  if (
    !headUuid(unit) ||
    ((mode === 'detail' || mode === 'post') && !headUuid(id)) ||
    (query.accountingUnitId !== undefined && query.accountingUnitId !== unit)
  )
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid accounting unit and record IDs are required.',
    })
  const config = useRuntimeConfig(event),
    base = String(
      config.ledgerApiBaseUrl || config.authApiBaseUrl || '',
    ).replace(/\/$/, '')
  if (!base)
    throw createError({
      statusCode: 503,
      statusMessage: 'Journal API is not configured.',
    })
  try {
    const r = await $fetch<{
      success: boolean
      result: any
      error?: { code: string }
    }>(
      `${base}/api/v1/ledger/journals${mode === 'post' ? `/${id}/post` : mode === 'detail' ? `/${id}` : mode === 'list' ? '' : `/${mode}`}`,
      {
        method,
        body,
        query: {
          accountingUnitId: unit,
          ...(method === 'DELETE' ? { version: query.version } : {}),
        },
        retry: 0,
        timeout: 15000,
        headers: { authorization: `Bearer ${accessToken}` },
      },
    )
    if (!r.success) {
      const codes: Record<string, number> = {
        validation_error: 400,
        unauthorized: 401,
        forbidden: 403,
        not_found: 404,
        conflict: 409,
        approval_required: 409,
      }
      throw createError({
        statusCode: codes[r.error?.code || ''] || 503,
        data: { code: r.error?.code },
      })
    }
    return r.result
  } catch (e: any) {
    const status = e?.response?.status || e?.statusCode
    const code =
      e?.data?.error?.code || e?.response?._data?.error?.code || e?.data?.code
    const detail = e?.data?.error?.message || e?.response?._data?.error?.message
    const currencyConfigurationMessages = [
      'Configure the General Ledger system number journal-batch-id before creating journals.',
      'Batch preview no longer matches the numbering settings. Reload the journal form.',
      'Check journal-batch-id numbering tokens, padding and maximum formatted length (40 bytes).',
      'Set a live active default currency on the company profile before entering journals.',
      'Accounting unit base currency must match the company profile default currency. Reconcile currency configuration before entering or posting journals.',
    ]
    if (
      code === 'validation_error' &&
      currencyConfigurationMessages.includes(detail)
    )
      throw createError({ statusCode: 400, statusMessage: detail })
    if (code === 'schema_not_ready')
      throw createError({
        statusCode: 503,
        statusMessage:
          'Journal database upgrade required. Apply migrations 008_company_profiles.sql, 012_journals.sql and 014_journal_organization_units.sql (after their prerequisites) to the backend database.',
      })
    if (code === 'approval_required')
      throw createError({
        statusCode: 409,
        statusMessage:
          'An active journal approval policy applies. Direct draft posting is not permitted; use the approval workflow.',
      })
    const messages: Record<number, string> = {
      400: 'Check active GL/currency, line dates, nonnegative amounts (6 decimals), rates (10 decimals), and posting period. Final posting requires exact balance.',
      401: 'Sign in again to continue.',
      403: 'Tenant access required.',
      404: 'The journal or active accounting unit is no longer available.',
      409: 'Journal changed, is no longer a draft, period is closed, or number is reserved. Refresh before retrying.',
    }
    throw createError({
      statusCode: messages[status] ? status : 503,
      statusMessage:
        messages[status] || 'Journal service unavailable. Please retry.',
    })
  }
}
