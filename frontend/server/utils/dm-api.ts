import { createError, getHeader, getQuery, getRouterParam, readBody, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
import { headUuid } from './account-head-api'

export const dmResources = new Set([
  'folders',
  'templates',
  'retention-policies',
  'documents',
  'workflows',
  'saved-searches',
])

const dmSubResources: Record<string, Set<string>> = {
  documents: new Set(['versions', 'notes', 'relations', 'workflow']),
}

const dmActions: Record<string, Set<string>> = {
  documents: new Set(['checkout', 'checkin', 'lock', 'unlock', 'bookmark']),
}

export type DmProxyMode =
  | 'summary'
  | 'next-number'
  | 'audit'
  | 'trash'
  | 'trash-restore'
  | 'trash-purge'
  | 'saved-searches'
  | 'list'
  | 'detail'
  | 'action'
  | 'sub-list'
  | 'sub-create'
  | 'sub-delete'
  | 'sub-action'
  | 'workflow-action'

function mapErrorStatus(code?: string): number {
  if (code === 'validation_error') return 400
  if (code === 'unauthorized') return 401
  if (code === 'forbidden') return 403
  if (code === 'not_found') return 404
  if (code === 'conflict' || code === 'approval_required') return 409
  return 503
}

export async function dmRequest(
  event: H3Event,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  mode: DmProxyMode = 'list',
) {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)

  const { accessToken } = await requireBusinessDeskSession(event)
  const resource = getRouterParam(event, 'resource') || ''
  const id = getRouterParam(event, 'id') || ''
  const sub = getRouterParam(event, 'sub') || ''
  const subId = getRouterParam(event, 'subId') || ''
  const act = getRouterParam(event, 'action') || ''
  const query = getQuery(event)
  const body = method === 'POST' || method === 'PUT' ? await readBody(event) : undefined

  if (['list', 'detail', 'action', 'sub-list', 'sub-create', 'sub-delete', 'sub-action', 'workflow-action'].includes(mode) && !dmResources.has(resource))
    throw createError({ statusCode: 404, statusMessage: 'Unknown Document Management resource.' })

  if (['detail', 'action', 'sub-list', 'sub-create', 'sub-delete', 'sub-action', 'workflow-action'].includes(mode) && !headUuid(id))
    throw createError({ statusCode: 400, statusMessage: 'A valid record ID is required.' })

  if (mode === 'action' && !dmActions[resource]?.has(act))
    throw createError({ statusCode: 404, statusMessage: 'Unknown Document Management action.' })

  if (['sub-list', 'sub-create', 'sub-delete', 'sub-action'].includes(mode) && !dmSubResources[resource]?.has(sub))
    throw createError({ statusCode: 404, statusMessage: 'Unknown Document Management sub-resource.' })

  const config = useRuntimeConfig(event)
  const base = String(config.ledgerApiBaseUrl || config.authApiBaseUrl || '').replace(/\/$/, '')
  if (!base)
    throw createError({ statusCode: 503, statusMessage: 'Document Management API is not configured.' })

  let path = '/api/v1/dm/' + resource
  if (mode === 'summary') path = '/api/v1/dm/dashboard/summary'
  else if (mode === 'next-number') path = '/api/v1/dm/next-number'
  else if (mode === 'audit') path = '/api/v1/dm/audit'
  else if (mode === 'trash') path = '/api/v1/dm/trash'
  else if (mode === 'trash-restore') path = `/api/v1/dm/trash/${id}/restore`
  else if (mode === 'trash-purge') path = `/api/v1/dm/trash/${id}`
  else if (mode === 'saved-searches') path = id ? `/api/v1/dm/saved-searches/${id}` : '/api/v1/dm/saved-searches'
  else if (mode === 'detail') path = `/api/v1/dm/${resource}/${id}`
  else if (mode === 'action') path = `/api/v1/dm/${resource}/${id}/${act}`
  else if (mode === 'workflow-action') path = `/api/v1/dm/${resource}/${id}/workflow/${act}`
  else if (mode === 'sub-list' || mode === 'sub-create') path = `/api/v1/dm/${resource}/${id}/${sub}`
  else if (mode === 'sub-delete') path = `/api/v1/dm/${resource}/${id}/${sub}/${subId}`
  else if (mode === 'sub-action') path = `/api/v1/dm/${resource}/${id}/${sub}/${subId}/${act}`

  try {
    const result = await $fetch<{ success: boolean; result?: any; message?: string; error?: { code?: string; message?: string } }>(`${base}${path}`, {
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
        statusMessage: result.error?.message || 'Document Management request failed.',
      })
    }
    return result.result ?? { message: result.message }
  } catch (error: any) {
    const status = error?.response?.status || error?.statusCode
    const backendMessage = error?.data?.error?.message || error?.data?.statusMessage || error?.statusMessage
    if (!status || status >= 500) {
      throw createError({
        statusCode: 503,
        statusMessage: backendMessage || 'Document Management service unavailable. Please retry.',
      })
    }
    throw createError({
      statusCode: status,
      statusMessage: backendMessage || error?.message || 'Document Management request failed.',
    })
  }
}
