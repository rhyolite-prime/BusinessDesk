import { createError, readBody, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
export async function preferencesRequest(
  event: H3Event,
  operation: 'get' | 'save' | 'preview' | 'reset' | 'history',
) {
  setHeader(event, 'Cache-Control', 'no-store')
  const write = ['save', 'preview', 'reset'].includes(operation)
  if (write) checkAuthOrigin(event)
  const { accessToken } = await requireBusinessDeskSession(event)
  const config = useRuntimeConfig(event),
    base = String(
      config.ledgerApiBaseUrl || config.authApiBaseUrl || '',
    ).replace(/\/$/, '')
  if (!base)
    throw createError({
      statusCode: 503,
      statusMessage: 'Preferences API is not configured.',
    })
  const body = write ? await readBody(event) : undefined
  try {
    const response = await $fetch<{
      success: boolean
      result: any
      error?: { code: string }
    }>(
      `${base}/api/v1/preferences${operation === 'preview' ? '/reset/preview' : operation === 'reset' ? '/reset/execute' : operation === 'history' ? '/reset/history' : ''}`,
      {
        method: operation === 'save' ? 'PUT' : write ? 'POST' : 'GET',
        body,
        headers: { authorization: `Bearer ${accessToken}` },
        retry: 0,
        timeout: 90000,
      },
    )
    if (!response.success)
      throw createError({ statusCode: 503, data: response })
    return response.result
  } catch (error: any) {
    const data = error?.response?._data || error?.data,
      code = data?.error?.code
    const mapping: Record<string, [number, string]> = {
      schema_not_ready: [
        503,
        'Apply migration 015_tenant_preferences.sql to enable preferences and tenant data initialization.',
      ],
      validation_error: [
        400,
        'Check the selected settings, tables, preview plan, confirmation and reset reason.',
      ],
      unauthorized: [401, 'Sign in again to continue.'],
      reauthentication_failed: [
        401,
        'Current password is incorrect. No data was changed.',
      ],
      forbidden: [
        403,
        'Only tenant administrators can change preferences or initialize business data.',
      ],
      conflict: [
        409,
        'The preview is blocked, expired, already used or out of date. Review dependencies and preview again.',
      ],
      rate_limited: [
        429,
        'Too many reset authentication attempts. Try again in 15 minutes.',
      ],
    }
    const [statusCode, statusMessage] = mapping[code] || [
      503,
      'Service unavailable or commit could not be confirmed. Review reset history before retrying.',
    ]
    const blocked =
      code === 'conflict' && Array.isArray(data?.result?.blocked)
        ? data.result.blocked
            .filter((x: unknown) => typeof x === 'string')
            .slice(0, 100)
        : undefined
    throw createError({
      statusCode,
      statusMessage,
      data: blocked ? { blocked } : undefined,
    })
  }
}
