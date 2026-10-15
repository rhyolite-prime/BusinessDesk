import { createError, deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import type { BusinessDeskUser } from '../../app/composables/useBusinessDeskAuth'

export const businessDeskSessionCookie = 'businessdesk_session'
const demoSessionCookie = 'businessdesk_demo_session'
const authChallengeCookie = 'businessdesk_auth_challenge'
export const demoTwoFactorCode = '246810'
const challengeLifetimeSeconds = 5 * 60
const maxDemoAttempts = 5

export interface BusinessDeskSession {
  user: BusinessDeskUser
  accessToken: string | null
  demo: boolean
}

export interface DemoAuthChallenge {
  accountId: string
  username: string
  attempts: number
  expiresAt: number
}

interface AuthSessionResponse {
  user?: unknown
}

const demoChallenges = new Map<string, DemoAuthChallenge>()

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
    // The mock flow is only usable in Nuxt development, even if misconfigured in production.
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

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

export function getAuthChallengeId(event: H3Event): string | null {
  return getCookie(event, authChallengeCookie) || null
}

export function setAuthChallengeCookie(event: H3Event, challengeId: string, maxAge = challengeLifetimeSeconds) {
  setCookie(event, authChallengeCookie, challengeId, cookieOptions(maxAge))
}

export function clearAuthChallenge(event: H3Event) {
  const challengeId = getAuthChallengeId(event)
  if (challengeId) demoChallenges.delete(challengeId)
  deleteCookie(event, authChallengeCookie, { path: '/' })
}

export function startDemoAuthChallenge(event: H3Event, accountId: string, username: string) {
  const now = Date.now()
  for (const [id, challenge] of demoChallenges) {
    if (challenge.expiresAt <= now) demoChallenges.delete(id)
  }

  const challengeId = crypto.randomUUID()
  demoChallenges.set(challengeId, {
    accountId,
    username,
    attempts: 0,
    expiresAt: now + challengeLifetimeSeconds * 1000,
  })
  setAuthChallengeCookie(event, challengeId)
  return { maskedDestination: 'mock verification channel', demoCode: demoTwoFactorCode }
}

function getActiveDemoChallenge(event: H3Event): { id: string; challenge: DemoAuthChallenge } | null {
  const id = getAuthChallengeId(event)
  if (!id) return null
  const challenge = demoChallenges.get(id)
  if (!challenge || challenge.expiresAt <= Date.now()) {
    demoChallenges.delete(id)
    clearAuthChallenge(event)
    return null
  }
  return { id, challenge }
}

export function getDemoAuthChallenge(event: H3Event): DemoAuthChallenge | null {
  return getActiveDemoChallenge(event)?.challenge ?? null
}

export function recordDemoAuthFailure(event: H3Event) {
  const active = getActiveDemoChallenge(event)
  if (!active) return { locked: true, remainingAttempts: 0 }
  active.challenge.attempts += 1
  const remainingAttempts = Math.max(0, maxDemoAttempts - active.challenge.attempts)
  if (remainingAttempts === 0) {
    demoChallenges.delete(active.id)
    clearAuthChallenge(event)
  }
  return { locked: remainingAttempts === 0, remainingAttempts }
}

export function consumeDemoAuthChallenge(event: H3Event): DemoAuthChallenge | null {
  const active = getActiveDemoChallenge(event)
  if (!active) return null
  demoChallenges.delete(active.id)
  clearAuthChallenge(event)
  return active.challenge
}

export function setAuthSessionCookie(event: H3Event, accessToken: string, maxAge: number) {
  setCookie(event, businessDeskSessionCookie, accessToken, cookieOptions(maxAge))
  deleteCookie(event, demoSessionCookie, { path: '/' })
  clearAuthChallenge(event)
}

export function setDemoSessionCookie(event: H3Event, user: BusinessDeskUser) {
  const encoded = Buffer.from(JSON.stringify(user), 'utf8').toString('base64url')
  setCookie(event, demoSessionCookie, encoded, cookieOptions(60 * 60 * 8))
  deleteCookie(event, businessDeskSessionCookie, { path: '/' })
  clearAuthChallenge(event)
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
  clearAuthChallenge(event)
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
