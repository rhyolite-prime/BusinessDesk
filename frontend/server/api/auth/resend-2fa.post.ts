import { createError, defineEventHandler, setResponseHeader } from 'h3'
import {
  clearAuthChallenge,
  demoTwoFactorCode,
  getAuthChallengeId,
  getAuthSettings,
  getDemoAuthChallenge,
  setAuthChallengeCookie,
} from '../../utils/auth'

interface ResendResponse {
  maskedDestination?: unknown
  expiresInSeconds?: unknown
}

function upstreamStatus(error: unknown): number {
  if (!error || typeof error !== 'object') return 0
  const source = error as { statusCode?: unknown; response?: { status?: unknown }; data?: { statusCode?: unknown } }
  return Number(source.statusCode || source.response?.status || source.data?.statusCode || 0)
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const { serviceBaseUrl, demoEnabled } = getAuthSettings(event)
  const challengeId = getAuthChallengeId(event)
  if (!challengeId) {
    throw createError({ statusCode: 401, statusMessage: 'This verification challenge has expired. Start sign-in again.' })
  }

  if (!serviceBaseUrl && demoEnabled) {
    if (!getDemoAuthChallenge(event)) {
      clearAuthChallenge(event)
      throw createError({ statusCode: 401, statusMessage: 'This verification challenge has expired. Start sign-in again.' })
    }
    setAuthChallengeCookie(event, challengeId)
    return { maskedDestination: 'mock verification channel', demo: true, demoCode: demoTwoFactorCode }
  }

  if (!serviceBaseUrl) {
    clearAuthChallenge(event)
    throw createError({ statusCode: 503, statusMessage: 'Authentication is not configured.' })
  }

  let response: ResendResponse
  try {
    response = await $fetch<ResendResponse>(`${serviceBaseUrl}/api/v1/auth/resend-2fa`, {
      method: 'POST',
      body: { challengeId },
    })
  } catch (error: unknown) {
    const status = upstreamStatus(error)
    if (status === 400 || status === 401 || status === 403) {
      clearAuthChallenge(event)
      throw createError({ statusCode: 401, statusMessage: 'This verification challenge has expired. Start sign-in again.' })
    }
    throw createError({ statusCode: 502, statusMessage: 'The verification code could not be resent. Try again shortly.' })
  }

  const destination = typeof response?.maskedDestination === 'string' ? response.maskedDestination.trim() : ''
  const maskedDestination = destination && destination.length <= 120 ? destination : 'your registered contact'
  const requestedMaxAge = Number(response.expiresInSeconds)
  const maxAge = Number.isFinite(requestedMaxAge) && requestedMaxAge > 0
    ? Math.min(Math.floor(requestedMaxAge), 10 * 60)
    : 5 * 60
  setAuthChallengeCookie(event, challengeId, maxAge)
  return { maskedDestination, demo: false }
})
