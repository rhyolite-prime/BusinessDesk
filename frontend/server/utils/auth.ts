import { createError, deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import type { BusinessDeskUser } from '../../app/composables/useBusinessDeskAuth'

export const businessDeskSessionCookie = 'businessdesk_session'
const demoSessionCookie = 'businessdesk_demo_session'

export interface BusinessDeskSession {
  user: BusinessDeskUser
  accessToken: string | null
  demo: boolean
}

interface AuthSessionResponse {
  user?: unknown
}

function upstreamStatus(error: unknown): number {
  if (!error || typeof error !== 'object') return 0
  const source = error as { statusCode?: unknown; response?: { status?: unknown }; data?: { statusCode?: unknown } }
  return Number(source.statusCode || source.response?.status || source.data?.statusCode || 0)
}

export function getAuthSettings(event: H3Event) {
  const config = useRuntimeConfig(event)
  const serviceBaseUrl = String(config.authApiBaseUrl || '').replace(/\/+$/, '')
  return {
    serviceBaseUrl,
    demoEnabled: !serviceBaseUrl && Boolean(config.authDemoMode) && process.env.NODE_ENV === 'development',
  }
}

export function mapBusinessDeskUser(value: unknown): BusinessDeskUser | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  const accountId = typeof source.accountId === 'string' ? source.accountId.trim() : ''
  const username = typeof source.username === 'string' ? source.username.trim() : ''
  const displayName = typeof source.displayName === 'string' ? source.displayName.trim() : ''
  if (!accountId || accountId.length > 80 || !username || username.length > 100 || displayName.length > 160) return null
  return { accountId, username, displayName: displayName || username }
}

export function createDemoUser(accountId: string, username: string): BusinessDeskUser {
  const displayName = username
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
  return { accountId, username, displayName: displayName || username }
}

export function setAuthSessionCookie(event: H3Event, accessToken: string, maxAge: number) {
  setCookie(event, businessDeskSessionCookie, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
  deleteCookie(event, demoSessionCookie, { path: '/' })
}

export function setDemoSessionCookie(event: H3Event, user: BusinessDeskUser) {
  const encoded = Buffer.from(JSON.stringify(user), 'utf8').toString('base64url')
  setCookie(event, demoSessionCookie, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })
  deleteCookie(event, businessDeskSessionCookie, { path: '/' })
}

function getDemoSessionUser(event: H3Event): BusinessDeskUser | null {
  const encoded = getCookie(event, demoSessionCookie)
  if (!encoded) return null
  try {
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as unknown
    return mapBusinessDeskUser(decoded)
  } catch {
    return null
  }
}

export function clearAuthSessionCookies(event: H3Event) {
  deleteCookie(event, businessDeskSessionCookie, { path: '/' })
  deleteCookie(event, demoSessionCookie, { path: '/' })
}

export async function resolveBusinessDeskSession(event: H3Event): Promise<BusinessDeskSession | null> {
  const { serviceBaseUrl, demoEnabled } = getAuthSettings(event)
  const accessToken = getCookie(event, businessDeskSessionCookie)

  if (accessToken && serviceBaseUrl) {
    let response: AuthSessionResponse
    try {
      response = await $fetch<AuthSessionResponse>(`${serviceBaseUrl}/api/v1/auth/session`, {
        headers: { authorization: `Bearer ${accessToken}` },
      })
    } catch (error: unknown) {
      const status = upstreamStatus(error)
      if (status === 401 || status === 403) {
        clearAuthSessionCookies(event)
        return null
      }
      throw createError({
        statusCode: 502,
        statusMessage: 'The authentication service is unavailable.',
        data: { code: 'AUTH_UPSTREAM_UNAVAILABLE' },
      })
    }

    const user = mapBusinessDeskUser(response?.user)
    if (!user) {
      clearAuthSessionCookies(event)
      throw createError({ statusCode: 502, statusMessage: 'The authentication service returned an invalid session.' })
    }
    return { user, accessToken, demo: false }
  }

  if (accessToken) clearAuthSessionCookies(event)
  if (!serviceBaseUrl && demoEnabled) {
    const user = getDemoSessionUser(event)
    if (user) return { user, accessToken: null, demo: true }
  }

  deleteCookie(event, demoSessionCookie, { path: '/' })
  return null
}

export async function requireBusinessDeskSession(event: H3Event): Promise<BusinessDeskSession> {
  const session = await resolveBusinessDeskSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in is required to access this resource.' })
  }
  return session
}
