import { defineEventHandler, getCookie, setResponseHeader } from 'h3'
import { businessDeskSessionCookie, clearAuthSessionCookies, getAuthSettings } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const { serviceBaseUrl } = getAuthSettings(event)
  const accessToken = getCookie(event, businessDeskSessionCookie)

  if (serviceBaseUrl && accessToken) {
    try {
      await $fetch(`${serviceBaseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}` },
      })
    } catch {
      // The browser session is cleared even if remote token revocation fails.
    }
  }

  clearAuthSessionCookies(event)
  return { loggedOut: true }
})
