import { createError, getHeader, getQuery, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { parseDashboardFilters } from '../../app/features/ledger/dashboard-filters'
import type { DashboardOptions, DashboardResponse } from '../../app/features/ledger/types'

export async function ledgerDashboardRequest(event: H3Event, mode: 'dashboard' | 'options' = 'dashboard') {
  setHeader(event, 'Cache-Control', 'no-store')
  const session = await requireBusinessDeskSession(event)
  if (session.demo || !session.accessToken) throw createError({ statusCode: 403, statusMessage: 'Live tenant sign-in is required for the ledger dashboard.' })
  let query: Record<string, string | boolean> = {}
  try {
    const raw = getQuery(event)
    if (mode === 'options') {
      if (Object.keys(raw).length) throw new Error('Dashboard options do not accept filters.')
    } else {
      query = { ...parseDashboardFilters(raw) }
    }
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : 'Invalid dashboard filters.' })
  }
  const config = useRuntimeConfig(event)
  const base = String(config.ledgerApiBaseUrl || config.authApiBaseUrl || '').replace(/\/$/, '')
  if (!base) throw createError({ statusCode: 503, statusMessage: 'Ledger dashboard API is not configured.' })
  try {
    const result = await $fetch<{
      success: boolean
      result: DashboardResponse | DashboardOptions
      error?: { code: string }
    }>(`${base}/api/v1/ledger/dashboard${mode === 'options' ? '/options' : ''}`, {
      query, retry: 0, timeout: 60000,
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID(),
      },
    })
    if (!result.success) {
      const codes: Record<string, number> = { validation_error: 400, unauthorized: 401, forbidden: 403, not_found: 404 }
      throw createError({ statusCode: codes[result.error?.code || ''] || 503 })
    }
    const data = result.result
    if (!data || (mode === 'options'
      ? !('accountingUnits' in data && Array.isArray(data.accountingUnits) && Array.isArray(data.costCenters) && Array.isArray(data.currencies) && Array.isArray(data.sources))
      : !('accountingUnit' in data && data.accountingUnit && Array.isArray(data.metrics) && Array.isArray(data.cashPosition) && Array.isArray(data.recentJournals) && Array.isArray(data.journalStatuses) && Array.isArray(data.pendingJournals)))) {
      throw createError({ statusCode: 503 })
    }
    return data
  } catch (error: any) {
    const status = error?.response?.status || error?.statusCode
    const messages: Record<number, string> = {
      400: 'Check the accounting unit, date range and dashboard filters.',
      401: 'Sign in again to load the ledger dashboard.',
      403: 'Active tenant access is required.',
      404: 'The accounting unit, cost center or currency is no longer available. Refresh the filter options.',
    }
    throw createError({
      statusCode: messages[status] ? status : 503,
      statusMessage: messages[status] || 'Ledger dashboard service unavailable. Check the ledger API connection and database prerequisites, then retry.',
    })
  }
}
