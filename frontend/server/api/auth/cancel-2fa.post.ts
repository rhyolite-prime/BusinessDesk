import { defineEventHandler, setResponseHeader } from 'h3'
import { clearAuthChallenge, getAuthChallengeId, getAuthSettings } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const { serviceBaseUrl } = getAuthSettings(event)
  const challengeId = getAuthChallengeId(event)

  if (serviceBaseUrl && challengeId) {
    try {
      await $fetch(`${serviceBaseUrl}/api/v1/auth/cancel-2fa`, {
        method: 'POST',
        body: { challengeId },
      })
    } catch {
      // Local challenge cookies are cleared even if the remote cancel request fails.
    }
  }

  clearAuthChallenge(event)
  return { cancelled: true }
})
