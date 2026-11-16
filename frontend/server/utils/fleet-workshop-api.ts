import { createError, getHeader, getQuery, getRouterParam, readBody, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
import { headUuid } from './account-head-api'

/** Resources served by domain_services/fleet_workshop/FleetWorkshopService. */
export const fleetWorkshopResources = new Set([
  'asset-groups',
  'procedures',
  'vehicles',
  'employees',
  'meter-changes',
  'stalled-meters',
  'meter-readings',
  'fuel-logs',
  'fuel-tolerances',
  'lubricant-logs',
  'major-components',
  'tyres',
  'schedules',
  'job-cards',
  'diary-entries',
  'module-links',
])

const fleetOptionsResources = new Set(['gl-settings', 'asset-groups', 'vehicles', 'employees'])
const fleetNextNumberResources = new Set([
  'vehicles',
  'fuel-logs',
  'lubricant-logs',
  'schedules',
  'job-cards',
  'diary-entries',
])

const fleetSubResources: Record<string, Set<string>> = {
  'asset-groups': new Set(['materials', 'components']),
  vehicles: new Set(['pm-triggers']),
  'job-cards': new Set(['lines', 'assignments', 'milestones']),
}

const fleetSubItemResources: Record<string, Set<string>> = {
  'job-cards': new Set(['lines', 'milestones']),
}

const fleetActions: Record<string, Set<string>> = {
  vehicles: new Set(['resolve-stalled-meter', 'handoff-fa', 'fa-handoff']),
  'stalled-meters': new Set(['resolve-stalled-meter']),
  'fuel-logs': new Set(['post', 'reverse']),
  'lubricant-logs': new Set(['post', 'reverse']),
  'major-components': new Set(['mount', 'remove', 'repair', 'scrap']),
  tyres: new Set(['fit', 'rotate', 'repair', 'remove', 'retread', 'scrap']),
  schedules: new Set(['create-job-card', 'requisitions']),
  'job-cards': new Set(['lines', 'milestones', 'issue-parts', 'requisitions', 'post-gl', 'handoff', 'transition']),
  'diary-entries': new Set(['mark-paid', 'allocate', 'promote']),
}

export type FleetProxyMode =
  | 'summary'
  | 'reports'
  | 'gl-settings'
  | 'gl-settings-options'
  | 'schedules-generate'
  | 'options'
  | 'next-number'
  | 'list'
  | 'detail'
  | 'sub'
  | 'sub-item'
  | 'action'

function mapErrorStatus(code?: string): number {
  if (code === 'validation_error') return 400
  if (code === 'unauthorized') return 401
  if (code === 'forbidden') return 403
  if (code === 'not_found') return 404
  if (code === 'conflict' || code === 'approval_required') return 409
  return 503
}

/** Real-data Nuxt BFF adapter for Fleet & Workshop Management; no demo fallback
 * and no browser exposure of the bearer token. */
export async function fleetWorkshopRequest(
  event: H3Event,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  mode: FleetProxyMode = 'list',
) {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)

  const { accessToken } = await requireBusinessDeskSession(event)
  const resource = getRouterParam(event, 'resource') || ''
  const id = getRouterParam(event, 'id') || ''
  const sub = getRouterParam(event, 'sub') || ''
  const subId = getRouterParam(event, 'subId') || ''
  const query = getQuery(event)
  const body = method === 'POST' || method === 'PUT' ? await readBody(event) : undefined

  if (mode === 'options' && !fleetOptionsResources.has(resource))
    throw createError({ statusCode: 404, statusMessage: 'Unknown fleet options resource.' })
  if (mode === 'next-number' && !fleetNextNumberResources.has(resource))
    throw createError({ statusCode: 404, statusMessage: 'Unknown fleet sequence resource.' })
  if (['list', 'detail', 'sub', 'sub-item', 'action'].includes(mode) && !fleetWorkshopResources.has(resource))
    throw createError({ statusCode: 404, statusMessage: 'Unknown Fleet & Workshop resource.' })
  if (['detail', 'sub', 'sub-item', 'action'].includes(mode) && !headUuid(id))
    throw createError({ statusCode: 400, statusMessage: 'A valid record ID is required.' })
  if (mode === 'sub' && !fleetSubResources[resource]?.has(sub))
    throw createError({ statusCode: 404, statusMessage: 'Unknown Fleet & Workshop sub-resource.' })
  if (mode === 'sub-item' && (!fleetSubItemResources[resource]?.has(sub) || !headUuid(subId)))
    throw createError({ statusCode: 400, statusMessage: 'A valid Fleet & Workshop item ID is required.' })
  if (mode === 'action' && !fleetActions[resource]?.has(sub))
    throw createError({ statusCode: 404, statusMessage: 'Unknown Fleet & Workshop action.' })

  const unit = body?.accountingUnitId ?? query.accountingUnitId
  if (unit !== undefined && unit !== '' && !headUuid(unit))
    throw createError({ statusCode: 400, statusMessage: 'Select a valid accounting unit.' })
  for (const key of ['vehicleId', 'assetGroupId', 'sourceEntityId'] as const) {
    const val = query[key]
    if (val !== undefined && val !== '' && !headUuid(val))
      throw createError({ statusCode: 400, statusMessage: `Invalid ${key} filter.` })
  }

  const config = useRuntimeConfig(event)
  const base = String(config.ledgerApiBaseUrl || config.authApiBaseUrl || '').replace(/\/$/, '')
  if (!base)
    throw createError({ statusCode: 503, statusMessage: 'Fleet & Workshop API is not configured.' })

  const path =
    mode === 'summary' ? '/api/v1/fleet-workshop-management/dashboard/summary'
      : mode === 'reports' ? '/api/v1/fleet-workshop-management/reports'
      : mode === 'gl-settings' ? '/api/v1/fleet-workshop-management/gl-settings'
      : mode === 'gl-settings-options' ? '/api/v1/fleet-workshop-management/gl-settings/options'
      : mode === 'schedules-generate' ? '/api/v1/fleet-workshop-management/schedules/generate'
      : mode === 'options' ? `/api/v1/fleet-workshop-management/${resource}/options`
      : mode === 'next-number' ? `/api/v1/fleet-workshop-management/${resource}/next-number`
      : mode === 'sub-item' ? `/api/v1/fleet-workshop-management/${resource}/${id}/${sub}/${subId}`
      : mode === 'sub' || mode === 'action' ? `/api/v1/fleet-workshop-management/${resource}/${id}/${sub}`
      : mode === 'detail' ? `/api/v1/fleet-workshop-management/${resource}/${id}`
      : `/api/v1/fleet-workshop-management/${resource}`

  try {
    const result = await $fetch<{ success: boolean; result?: any; error?: { code?: string; message?: string } }>(`${base}${path}`, {
      method,
      query: { ...query },
      body,
      timeout: 20000,
      retry: 0,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID(),
      },
    })
    if (!result.success) {
      throw createError({
        statusCode: mapErrorStatus(result.error?.code),
        statusMessage: result.error?.message || 'Fleet & Workshop request failed.',
      })
    }
    return result.result
  } catch (error: any) {
    const status = error?.response?.status || error?.statusCode
    const backendMessage = error?.data?.error?.message || error?.data?.statusMessage || error?.statusMessage
    if (!status || status >= 500) {
      throw createError({
        statusCode: 503,
        statusMessage: backendMessage || 'Fleet & Workshop service unavailable. Please retry.',
      })
    }
    throw createError({
      statusCode: status,
      statusMessage: backendMessage || error?.message || 'Fleet & Workshop request failed.',
    })
  }
}
