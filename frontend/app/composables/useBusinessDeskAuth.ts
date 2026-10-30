export interface BusinessDeskUser {
  accountId: string
  username: string
  displayName: string
}

interface AuthIdentityResponse {
  authenticated?: boolean
  demo?: boolean
  accountId?: string
  username?: string
  name?: string
  officeName?: string
}

/**
 * Small compatibility adapter for the BusinessDesk workspace chrome. The
 * layered auth module owns server-verified TOTP and the httpOnly JWT cookie; this
 * composable exposes the identity shape used by the module manager/sidebar.
 */
export function useBusinessDeskAuth() {
  const user = useState<BusinessDeskUser | null>('businessdesk-user', () => null)
  const isDemo = useState<boolean>('businessdesk-auth-demo', () => false)
  const sessionChecked = useState<boolean>('businessdesk-session-checked', () => false)
  const isAuthenticated = computed(() => user.value !== null)
  const requestFetch = useRequestFetch()

  async function refreshSession() {
    try {
      const identity = await requestFetch<AuthIdentityResponse>('/api/auth/me')
      user.value = identity.authenticated && identity.username
        ? {
            accountId: identity.accountId || '',
            username: identity.username,
            displayName: identity.name || identity.username,
          }
        : null
      isDemo.value = Boolean(identity.authenticated && identity.demo)
    } catch {
      user.value = null
      isDemo.value = false
    } finally {
      sessionChecked.value = true
    }

    return user.value
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Clear local state even if the session service is unavailable.
    }
    user.value = null
    isDemo.value = false
    sessionChecked.value = true
    await navigateTo('/login', { replace: true })
  }

  return { user, isDemo, isAuthenticated, sessionChecked, refreshSession, logout }
}
