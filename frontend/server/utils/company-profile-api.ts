import { createError, readBody, setHeader, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'
import { companyProfileFields } from '../../app/features/ledger/company-profile-fields'
import { checkAuthOrigin } from '../../layers/shared/server/utils/tenant-auth'
export async function companyProfileRequest(event: H3Event, method: 'GET' | 'POST' | 'PUT' | 'DELETE') {
  setHeader(event, 'Cache-Control', 'no-store')
  if (method !== 'GET') checkAuthOrigin(event)
  const { accessToken } = await requireBusinessDeskSession(event)
  if (method === 'DELETE') throw createError({ statusCode: 403, statusMessage: 'Company profiles cannot be deleted.' })
  const config = useRuntimeConfig(event), base = String(config.ledgerApiBaseUrl || config.authApiBaseUrl || '').replace(/\/$/, '')
  if (!base) throw createError({ statusCode: 503, statusMessage: 'Company profile API is not configured.' })
  const body = method === 'POST' || method === 'PUT' ? await readBody(event) : undefined
  try {
    const r = await $fetch<{ success: boolean; result: Record<string, unknown>; error?: { code: string } }>(`${base}/api/v1/shared/company-profile`, { method, body, retry: 0, timeout: 15000, headers: { authorization: `Bearer ${accessToken}` } })
    if (!r.success) {
      const codes: Record<string, number> = { validation_error: 400, unauthorized: 401, forbidden: 403, not_found: 404, conflict: 409 }
      throw createError({ statusCode: codes[r.error?.code || ''] || 503 })
    }
    // Defense in depth: a future upstream change must not expose SMTP secrets.
    const allowed = ['id', 'hasEmailPassword', ...companyProfileFields.map(field => field.key)]
    return Object.fromEntries(allowed.filter(key => Object.hasOwn(r.result, key)).map(key => [key, r.result[key]]))
  } catch (e: any) {
    const status = e?.response?.status || e?.statusCode
    const messages: Record<number, string> = { 400: 'Check profile fields, email settings, currency and rates (0–100, up to six decimal places).', 401: 'Sign in again to continue.', 403: 'This operation is not permitted.', 404: 'No company profile has been created for this tenant.', 409: 'Your company already has a profile. Refresh to view or edit it.' }
    throw createError({ statusCode: messages[status] ? status : 503, statusMessage: messages[status] || 'Company profile service unavailable. Check the backend configuration or retry.' })
  }
}
