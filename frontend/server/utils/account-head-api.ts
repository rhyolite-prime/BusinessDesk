import { createError, getHeader, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'

export const headUuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value)

/** Dedicated real-data adapter: no demo fallback and no browser-visible JWT. */
export async function ledgerSetupRequest(event: H3Event, resource: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', query?: Record<string, unknown>, body?: Record<string, unknown>, label: 'account-heads' | 'accounting-units' = 'account-heads') {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const session = await requireBusinessDeskSession(event)
  const config = useRuntimeConfig(event)
  const base = String(config.ledgerApiBaseUrl || config.authApiBaseUrl || '').replace(/\/$/, '')
  if (!base) throw createError({ statusCode: 503, statusMessage: 'Ledger API is not configured.' })
  try {
    const result = await $fetch<{ success: boolean; result: any; error?: { code?: string; message?: string } }>(`${base}/api/v1/ledger/${resource}`, {
      method, query, body, timeout: 15000, retry: 0,
      headers: { authorization: `Bearer ${session.accessToken}`, 'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID() },
    })
    if (!result.success) {
      const code = result.error?.code
      throw createError({ statusCode: code === 'conflict' ? 409 : code === 'validation_error' ? 400 : code === 'not_found' ? 404 : 503 })
    }
    return result.result
  } catch (error: any) {
    const status = error?.response?.status || error?.statusCode
    const messages: Record<number, string> = {
      400: label === 'accounting-units' ? 'Check the code, name, currency, time zone and fiscal month.' : 'Check the head fields and parent. The parent must be active and have the same type.',
      401: 'Your session has expired. Sign in again.', 403: 'You do not have permission to perform this ledger operation.',
      404: label === 'accounting-units' ? 'This accounting unit is no longer available.' : 'The account head or accounting unit is no longer available.',
      409: label === 'accounting-units' ? 'This code already exists, or the unit has ledger dependencies that prevent this change.' : 'This change conflicts with an existing head or its dependent heads, controls or accounts.',
    }
    throw createError({ statusCode: messages[status] ? status : 503, statusMessage: messages[status] || (label === 'accounting-units' ? 'Accounting units service unavailable. Please retry.' : 'Account heads service unavailable. Please retry.') })
  }
}

export function validateHeadBody(body: unknown): Record<string, unknown> {
  const row = body as Record<string, unknown>
  const allowed = new Set(['accountingUnitId', 'name', 'parentId', 'accountType', 'isActive'])
  if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(key => !allowed.has(key)) ||
      !headUuid(row.accountingUnitId) || typeof row.name !== 'string' || !row.name.trim() || row.name.trim().length > 160 ||
      !Number.isInteger(row.accountType) || Number(row.accountType) < 0 || Number(row.accountType) > 4 || typeof row.isActive !== 'boolean' ||
      (row.parentId !== undefined && row.parentId !== null && row.parentId !== '' && !headUuid(row.parentId))) {
    throw createError({ statusCode: 400, statusMessage: 'Enter valid account head fields and select an accounting unit.' })
  }
  return { accountingUnitId: row.accountingUnitId, name: row.name.trim(), parentId: row.parentId || null, accountType: row.accountType, isActive: row.isActive }
}

export const accountHeadRequest = ledgerSetupRequest
