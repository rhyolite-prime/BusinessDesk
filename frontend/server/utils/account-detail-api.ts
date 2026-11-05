import { createError, type H3Event } from 'h3'
import { ledgerSetupRequest, headUuid } from './account-head-api'
export function accountDetailRequest(event: H3Event, resource: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', query?: Record<string, unknown>, body?: Record<string, unknown>) {
  return ledgerSetupRequest(event, resource, method, query, body, 'accounts')
}
export function validateAccountDetailBody(body: unknown): Record<string, unknown> {
  const row = body as Record<string, unknown>
  const allowed = new Set(['accountingUnitId', 'accountHeaderId', 'accountNumber', 'accountName', 'currencyId', 'status', 'allowManualPosting', 'isControlAccount'])
  if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(key => !allowed.has(key)) ||
      !headUuid(row.accountingUnitId) || !headUuid(row.accountHeaderId) ||
      typeof row.accountName !== 'string' || !row.accountName.trim() || row.accountName.trim().length > 200 ||
      typeof row.accountNumber !== 'string' || row.accountNumber.trim().length > 80 || !/^\d+$/.test(row.accountNumber.trim()) || Number(row.accountNumber.trim()) > 2147483647 ||
      (row.currencyId !== undefined && row.currencyId !== null && !headUuid(row.currencyId)) ||
      typeof row.status !== 'string' || !['active', 'inactive'].includes(row.status) || typeof row.allowManualPosting !== 'boolean' || typeof row.isControlAccount !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Provide a unit, active leaf control, numeric account number (0–2147483647), name, currency, status and boolean posting flags.' })
  }
  return { accountingUnitId: row.accountingUnitId, accountHeaderId: row.accountHeaderId, accountNumber: String(Number(row.accountNumber.trim())),
    accountName: row.accountName.trim(), currencyId: row.currencyId ?? null, status: row.status, allowManualPosting: row.allowManualPosting, isControlAccount: row.isControlAccount }
}
