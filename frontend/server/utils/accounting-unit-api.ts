import { createError, type H3Event } from 'h3'
import { ledgerSetupRequest, headUuid } from './account-head-api'
export function accountingUnitRequest(event: H3Event, resource: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', query?: Record<string, unknown>, body?: Record<string, unknown>) {
  return ledgerSetupRequest(event, resource, method, query, body, 'accounting-units')
}
export function unitId(value: unknown): string {
  if (!headUuid(value)) throw createError({ statusCode: 400, statusMessage: 'Invalid accounting unit UUID.' })
  return value
}
export function validateUnitBody(body: unknown): Record<string, unknown> {
  const row = body as Record<string, unknown>
  const allowed = new Set(['code', 'name', 'baseCurrencyId', 'timeZone', 'fiscalYearStartMonth', 'isActive'])
  if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(key => !allowed.has(key)) ||
      typeof row.code !== 'string' || !row.code.trim() || row.code.trim().length > 40 ||
      typeof row.name !== 'string' || !row.name.trim() || row.name.trim().length > 160 || !headUuid(row.baseCurrencyId) ||
      typeof row.timeZone !== 'string' || !row.timeZone.trim() || row.timeZone.trim().length > 80 ||
      !Number.isInteger(row.fiscalYearStartMonth) || Number(row.fiscalYearStartMonth) < 1 || Number(row.fiscalYearStartMonth) > 12 || typeof row.isActive !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Provide valid accounting unit fields.' })
  }
  try { new Intl.DateTimeFormat('en', { timeZone: row.timeZone.trim() }).format() }
  catch { throw createError({ statusCode: 400, statusMessage: 'Enter a valid IANA time zone, for example Africa/Accra or UTC.' }) }
  return { code: row.code.trim(), name: row.name.trim(), baseCurrencyId: row.baseCurrencyId, timeZone: row.timeZone.trim(), fiscalYearStartMonth: row.fiscalYearStartMonth, isActive: row.isActive }
}
