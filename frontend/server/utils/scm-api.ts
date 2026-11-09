import { createError, getHeader, getQuery, getRouterParam, readBody, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
import { headUuid } from './account-head-api'

/** Resources served by domain_services/supply_chain/SupplyChainService. */
const scmResources = new Set(['requisitions', 'orders', 'receipts'])
const scmActions: Record<string, Set<string>> = {
  requisitions: new Set(['submit', 'approve', 'reject', 'cancel', 'close']),
  orders: new Set(['submit', 'approve', 'reject', 'send', 'cancel', 'close']),
  receipts: new Set(['post', 'reverse', 'cancel']),
}

/** Real-data adapter for the supply chain service; mirrors inventory-api. */
export async function scmRequest(
  event: H3Event,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  mode: 'list' | 'detail' | 'action' | 'next-number' = 'list',
) {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const { accessToken } = await requireBusinessDeskSession(event)
  const resource = getRouterParam(event, 'resource') || ''
  const id = getRouterParam(event, 'id') || ''
  const action = getRouterParam(event, 'action') || ''
  const query = getQuery(event)
  const body = method === 'POST' || method === 'PUT' ? await readBody(event) : undefined
  if (!scmResources.has(resource))
    throw createError({ statusCode: 404, statusMessage: 'Unknown supply chain resource.' })
  if ((mode === 'detail' || mode === 'action') && !headUuid(id))
    throw createError({ statusCode: 400, statusMessage: 'A valid record ID is required.' })
  if (mode === 'action' && !scmActions[resource].has(action))
    throw createError({ statusCode: 404, statusMessage: 'Unknown supply chain action.' })
  const unit = body?.accountingUnitId ?? query.accountingUnitId
  if (unit !== undefined && unit !== '' && !headUuid(unit))
    throw createError({ statusCode: 400, statusMessage: 'Select a valid accounting unit.' })
  const config = useRuntimeConfig(event)
  const base = String(config.ledgerApiBaseUrl || config.authApiBaseUrl || '').replace(/\/$/, '')
  if (!base)
    throw createError({ statusCode: 503, statusMessage: 'Supply chain API is not configured.' })
  const path = mode === 'next-number' ? `/api/v1/scm/${resource}/next-number`
    : mode === 'detail' ? `/api/v1/scm/${resource}/${id}`
    : mode === 'action' ? `/api/v1/scm/${resource}/${id}/${action}`
    : `/api/v1/scm/${resource}`
  try {
    const result = await $fetch<{ success: boolean; result?: any; error?: { code?: string; message?: string } }>(`${base}${path}`, {
      method,
      query: { ...query },
      body,
      timeout: 20000,
      retry: 0,
      headers: { authorization: `Bearer ${accessToken}`, 'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID() },
    })
    if (!result.success) {
      const code = result.error?.code
      throw createError({
        statusCode: code === 'validation_error' ? 400 : code === 'conflict' ? 409 : code === 'not_found' ? 404 : code === 'forbidden' ? 403 : 503,
        statusMessage: result.error?.message,
      })
    }
    return result.result
  } catch (error: any) {
    const status = error?.response?.status || error?.statusCode
    if (!status || status >= 500) throw createError({ statusCode: 503, statusMessage: 'Supply chain service unavailable. Please retry.' })
    throw createError({ statusCode: status, statusMessage: error?.statusMessage || error?.data?.statusMessage || error?.message || 'Supply chain request failed.' })
  }
}
