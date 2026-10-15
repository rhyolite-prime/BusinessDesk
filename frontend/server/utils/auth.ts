import { createError, getCookie, type H3Event } from 'h3'
import { authStore } from '../../layers/shared/server/utils/auth-store'

/** Validate the demo session issued by the layered two-factor login flow. */
export async function requireBusinessDeskSession(event: H3Event) {
  const token = getCookie(event, 'tl_session')
  const session = token ? authStore().sessions.get(token) : undefined
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in is required to access the ledger.' })
  }

  return {
    userId: session.userId,
    username: session.username,
    demo: true,
    accessToken: null as string | null,
  }
}
