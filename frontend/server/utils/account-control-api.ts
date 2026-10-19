import { createError, type H3Event } from 'h3'
import { ledgerSetupRequest, headUuid } from './account-head-api'
export function accountControlRequest(event: H3Event, resource: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', query?: Record<string, unknown>, body?: Record<string, unknown>) {
  return ledgerSetupRequest(event, resource, method, query, body, 'account-controls')
}
export function validateControlBody(body: unknown): Record<string, unknown> {
  const row = body as Record<string, unknown>
  const allowed = new Set(['accountingUnitId', 'accountGroupId', 'parentAccountHeaderId', 'accountHeaderName', 'minAccount', 'maxAccount', 'isActive'])
  if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(key => !allowed.has(key)) ||
      !headUuid(row.accountingUnitId) || !headUuid(row.accountGroupId) ||
      typeof row.accountHeaderName !== 'string' || !row.accountHeaderName.trim() || row.accountHeaderName.trim().length > 160 ||
      !Number.isInteger(row.minAccount) || !Number.isInteger(row.maxAccount) || Number(row.minAccount) < 0 || Number(row.maxAccount) < Number(row.minAccount) || Number(row.maxAccount) > 2147483647 ||
      typeof row.isActive !== 'boolean' || (row.parentAccountHeaderId !== undefined && row.parentAccountHeaderId !== null && row.parentAccountHeaderId !== '' && !headUuid(row.parentAccountHeaderId))) {
    throw createError({ statusCode: 400, statusMessage: 'Provide a valid unit, head, control name, parent and whole-number range (0–2147483647).' })
  }
  return { accountingUnitId: row.accountingUnitId, accountGroupId: row.accountGroupId, parentAccountHeaderId: row.parentAccountHeaderId || null,
    accountHeaderName: row.accountHeaderName.trim(), minAccount: row.minAccount, maxAccount: row.maxAccount, isActive: row.isActive }
}
