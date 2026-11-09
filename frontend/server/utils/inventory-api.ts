import { createError, getHeader, getQuery, getRouterParam, readBody, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
import { headUuid } from './account-head-api'

/** Resources served by domain_services/inventory/InventoryService. */
export const inventoryResources = new Set([
  'items', 'uoms', 'item-categories', 'warehouses', 'bin-locations', 'item-warehouses',
  'item-suppliers', 'item-uom-conversions', 'batches', 'serials', 'balances', 'ledger',
  'snapshots', 'closes', 'documents',
])
// Workflow transitions the service implements. Documents cannot be rejected:
// the posted-state schema only allows draft, submitted, approved, posted,
// cancelled and reversed.
const documentActions = new Set(['submit', 'approve', 'post', 'cancel', 'reverse'])

/** Dedicated real-data adapter for the inventory service: no demo fallback and no
 * browser-visible JWT. The C++ service validates every payload again; this layer
 * only enforces shape sanity and maps transport errors. */
export async function inventoryRequest(
  event: H3Event,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  mode: 'list' | 'detail' | 'action' | 'next-number' | 'card' | 'summary' = 'list',
) {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const { accessToken } = await requireBusinessDeskSession(event)
  const resource = getRouterParam(event, 'resource') || ''
  const id = getRouterParam(event, 'id') || ''
  const action = getRouterParam(event, 'action') || ''
  const query = getQuery(event)
  const body = method === 'POST' || method === 'PUT' ? await readBody(event) : undefined
  if (mode !== 'summary' && !inventoryResources.has(resource))
    throw createError({ statusCode: 404, statusMessage: 'Unknown inventory resource.' })
  if ((mode === 'detail' || mode === 'action' || mode === 'card') && !headUuid(id))
    throw createError({ statusCode: 400, statusMessage: 'A valid record ID is required.' })
  if (mode === 'action') {
    const allowed = resource === 'documents' ? documentActions : new Set<string>()
    if (!allowed.has(action))
      throw createError({ statusCode: 404, statusMessage: 'Unknown inventory action.' })
  }
  const unit = body?.accountingUnitId ?? query.accountingUnitId
  if (mode !== 'summary' && unit !== undefined && unit !== '' && !headUuid(unit))
    throw createError({ statusCode: 400, statusMessage: 'Select a valid accounting unit.' })
  const config = useRuntimeConfig(event)
  const base = String(config.ledgerApiBaseUrl || config.authApiBaseUrl || '').replace(/\/$/, '')
  if (!base)
    throw createError({ statusCode: 503, statusMessage: 'Inventory API is not configured.' })
  const path = mode === 'summary' ? '/api/v1/inventory/dashboard/summary'
    : mode === 'next-number' ? `/api/v1/inventory/${resource}/next-number`
    : mode === 'card' ? `/api/v1/inventory/items/${id}/card`
    : mode === 'detail' ? `/api/v1/inventory/${resource}/${id}`
    : mode === 'action' ? `/api/v1/inventory/${resource}/${id}/${action}`
    : `/api/v1/inventory/${resource}`
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
    if (!status) throw createError({ statusCode: 503, statusMessage: 'Inventory service unavailable. Please retry.' })
    if (status >= 500) throw createError({ statusCode: 503, statusMessage: 'Inventory service unavailable. Please retry.' })
    throw createError({ statusCode: status, statusMessage: error?.statusMessage || error?.data?.statusMessage || error?.message || 'Inventory request failed.' })
  }
}
