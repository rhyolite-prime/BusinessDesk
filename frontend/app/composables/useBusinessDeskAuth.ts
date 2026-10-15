export interface BusinessDeskUser {
  accountId: string
  username: string
  displayName: string
}

export interface LoginCredentials {
  accountId: string
  username: string
  password: string
}

interface LoginResponse {
  user: BusinessDeskUser
  demo?: boolean
}

interface SessionResponse {
  user: BusinessDeskUser | null
  demo?: boolean
}

export function useBusinessDeskAuth() {
  const user = useState<BusinessDeskUser | null>('businessdesk-user', () => null)
  const isDemo = useState('businessdesk-auth-demo', () => false)
  const sessionChecked = useState('businessdesk-session-checked', () => false)
  const isAuthenticated = computed(() => user.value !== null)

  async function login(credentials: LoginCredentials) {
    const response = await $fetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: credentials,
    })
    user.value = response.user
    isDemo.value = response.demo ?? false
    sessionChecked.value = true
    return response.user
  }

  async function refreshSession() {
    const requestFetch = useRequestFetch()
    try {
      const response = await requestFetch<SessionResponse>('/api/auth/session')
      user.value = response.user
      isDemo.value = response.demo ?? false
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
      // Clear local state even if the upstream auth service is unavailable.
    }
    user.value = null
    isDemo.value = false
    sessionChecked.value = true
    await navigateTo('/login', { replace: true })
  }

  return { user, isDemo, isAuthenticated, sessionChecked, login, refreshSession, logout }
}
