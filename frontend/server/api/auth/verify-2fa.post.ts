import { createError, defineEventHandler, readBody, setResponseHeader } from 'h3'
import {
  clearAuthChallenge,
  consumeDemoAuthChallenge,
  createDemoUser,
  demoTwoFactorCode,
  getAuthChallengeId,
  getAuthSettings,
  getDemoAuthChallenge,
  mapBusinessDeskUser,
  recordDemoAuthFailure,
  setAuthSessionCookie,
  setDemoSessionCookie,
} from '../../utils/auth'

interface AuthVerifyResponse {
  accessToken?: unknown
  expiresInSeconds?: unknown
  user?: unknown
}

function upstreamStatus(error: unknown): number {
  if (!error || typeof error !== 'object') return 0
  const source = error as { statusCode?: unknown; response?: { status?: unknown }; data?: { statusCode?: unknown } }
  return Number(source.statusCode || source.response?.status || source.data?.statusCode || 0)
}

function sessionCookieMaxAge(value: unknown): number {
  const requested = Number(value)
  return Number.isFinite(requested) && requested > 0
    ? Math.min(Math.floor(requested), 24 * 60 * 60)
    : 8 * 60 * 60
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const body = await readBody<Record<string, unknown>>(event)
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (!/^\d{6}$/.test(code)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter the six-digit verification code.' })
  }

  const { serviceBaseUrl, demoEnabled } = getAuthSettings(event)
  const challengeId = getAuthChallengeId(event)
  if (!challengeId) {
    throw createError({ statusCode: 401, statusMessage: 'This verification challenge has expired. Start sign-in again.' })
  }

  if (!serviceBaseUrl && demoEnabled) {
    const challenge = getDemoAuthChallenge(event)
    if (!challenge) {
      clearAuthChallenge(event)
      throw createError({ statusCode: 401, statusMessage: 'This verification challenge has expired. Start sign-in again.' })
    }

    if (code !== demoTwoFactorCode) {
      const attempt = recordDemoAuthFailure(event)
      if (attempt.locked) {
        throw createError({ statusCode: 429, statusMessage: 'Too many incorrect codes. Start sign-in again.' })
      }
      throw createError({
        statusCode: 400,
        statusMessage: `That code is not correct. ${attempt.remainingAttempts} attempts remain.`,
      })
    }

    const acceptedChallenge = consumeDemoAuthChallenge(event)
    if (!acceptedChallenge) {
      throw createError({ statusCode: 401, statusMessage: 'This verification challenge has expired. Start sign-in again.' })
    }
    const user = createDemoUser(acceptedChallenge.accountId, acceptedChallenge.username)
    setDemoSessionCookie(event, user)
    return { user, demo: true }
  }

  if (!serviceBaseUrl) {
    clearAuthChallenge(event)
    throw createError({ statusCode: 503, statusMessage: 'Authentication is not configured.' })
  }

  let response: AuthVerifyResponse
  try {
    response = await $fetch<AuthVerifyResponse>(`${serviceBaseUrl}/api/v1/auth/verify-2fa`, {
      method: 'POST',
      body: { challengeId, code },
    })
  } catch (error: unknown) {
    const status = upstreamStatus(error)
    if (status === 400 || status === 401 || status === 403) {
      throw createError({ statusCode: 400, statusMessage: 'That verification code is invalid or expired.' })
    }
    if (status >= 400 && status < 500) {
      throw createError({ statusCode: status, statusMessage: 'The authentication service could not verify this code.' })
    }
    throw createError({ statusCode: 502, statusMessage: 'The authentication service is unavailable. Try again shortly.' })
  }

  const user = mapBusinessDeskUser(response?.user)
  const accessToken = typeof response?.accessToken === 'string' ? response.accessToken.trim() : ''
  if (!user || !accessToken || accessToken.length > 3500 || /\s/.test(accessToken)) {
    throw createError({ statusCode: 502, statusMessage: 'The authentication service returned an invalid verification response.' })
  }

  setAuthSessionCookie(event, accessToken, sessionCookieMaxAge(response.expiresInSeconds))
  return { user, demo: false }
})
