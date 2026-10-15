import { createError, defineEventHandler, readBody, setResponseHeader } from 'h3'
import { createDemoUser, getAuthSettings, setAuthSessionCookie, setDemoSessionCookie, mapBusinessDeskUser } from '../../utils/auth'

interface AuthLoginResponse {
  accessToken?: unknown
  expiresInSeconds?: unknown
  user?: unknown
}

function upstreamStatus(error: unknown): number {
  if (!error || typeof error !== 'object') return 0
  const source = error as { statusCode?: unknown; response?: { status?: unknown }; data?: { statusCode?: unknown } }
  return Number(source.statusCode || source.response?.status || source.data?.statusCode || 0)
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const body = await readBody<Record<string, unknown>>(event)
  const accountId = typeof body?.accountId === 'string' ? body.accountId.trim() : ''
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!accountId || !username || !password || accountId.length > 80 || username.length > 100 || password.length > 256) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid account ID, username, and password.' })
  }

  const { serviceBaseUrl, demoEnabled } = getAuthSettings(event)
  if (!serviceBaseUrl) {
    if (!demoEnabled) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Authentication is not configured. Set AUTH_API_BASE_URL or explicitly enable local demo sign-in.',
        data: { code: 'AUTH_SERVICE_UNAVAILABLE' },
      })
    }

    const user = createDemoUser(accountId, username)
    setDemoSessionCookie(event, user)
    return { user, demo: true }
  }

  let response: AuthLoginResponse
  try {
    response = await $fetch<AuthLoginResponse>(`${serviceBaseUrl}/api/v1/auth/login`, {
      method: 'POST',
      body: { accountId, username, password },
    })
  } catch (error: unknown) {
    const status = upstreamStatus(error)
    if (status === 401 || status === 403) {
      throw createError({ statusCode: 401, statusMessage: 'The account ID, username, or password is incorrect.' })
    }
    if (status >= 400 && status < 500) {
      throw createError({ statusCode: status, statusMessage: 'The authentication service could not accept this sign-in.' })
    }
    throw createError({
      statusCode: 502,
      statusMessage: 'The authentication service is unavailable. Please try again shortly.',
      data: { code: 'AUTH_UPSTREAM_UNAVAILABLE' },
    })
  }

  const user = mapBusinessDeskUser(response?.user)
  const accessToken = typeof response?.accessToken === 'string' ? response.accessToken.trim() : ''
  if (!user || !accessToken || accessToken.length > 3500 || /\s/.test(accessToken)) {
    throw createError({ statusCode: 502, statusMessage: 'The authentication service returned an invalid sign-in response.' })
  }

  const requestedMaxAge = Number(response.expiresInSeconds)
  const maxAge = Number.isFinite(requestedMaxAge) && requestedMaxAge > 0
    ? Math.min(Math.floor(requestedMaxAge), 24 * 60 * 60)
    : 8 * 60 * 60
  setAuthSessionCookie(event, accessToken, maxAge)
  return { user, demo: false }
})
