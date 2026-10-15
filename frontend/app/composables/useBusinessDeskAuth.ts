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

export interface LoginChallenge {
  requiresTwoFactor: true
  maskedDestination: string
  demo: boolean
  demoCode?: string
}

interface VerifyResponse {
  user: BusinessDeskUser
  demo?: boolean
}

interface SessionResponse {
  user: BusinessDeskUser | null
  demo?: boolean
}

export interface ResendCodeResponse {
  maskedDestination: string
  demo: boolean
  demoCode?: string
}

export function useBusinessDeskAuth() {
  const user = useState<BusinessDeskUser | null>('businessdesk-user', () => null)
  const isDemo = useState('businessdesk-auth-demo', () => false)
  const sessionChecked = useState('businessdesk-session-checked', () => false)
  const isAuthenticated = computed(() => user.value !== null)

  async function beginLogin(credentials: LoginCredentials) {
    return await $fetch<LoginChallenge>('/api/auth/login', {
      method: 'POST',
      body: credentials,
    })
  }

  async function verifyTwoFactor(code: string) {
    const response = await $fetch<VerifyResponse>('/api/auth/verify-2fa', {
      method: 'POST',
      body: { code },
    })
    user.value = response.user
    isDemo.value = response.demo ?? false
    sessionChecked.value = true
    return response.user
  }

  async function resendTwoFactor() {
    return await $fetch<ResendCodeResponse>('/api/auth/resend-2fa', { method: 'POST' })
  }

  async function cancelTwoFactor() {
    try {
      await $fetch('/api/auth/cancel-2fa', { method: 'POST' })
    } catch {
      // A pending challenge expires on the server if cancellation is unavailable.
    }
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

  return { user, isDemo, isAuthenticated, sessionChecked, beginLogin, verifyTwoFactor, resendTwoFactor, cancelTwoFactor, refreshSession, logout }
}
