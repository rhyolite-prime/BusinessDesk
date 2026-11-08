/**
 * Mock authentication state.
 * In production these sessions/2FA secrets live in the Fineract auth
 * backend (or the identity provider); here they live in-process so the
 * console is self-contained for demo and development.
 */
export interface AuthSession {
  userId: number
  username: string
  issuedAt: number
}

declare global {
  // eslint-disable-next-line no-var
  var __tlAuth: {
    sessions: Map<string, AuthSession>
    /** pending login: username awaiting 2FA step */
    pendingLogin: Map<string, { username: string; createdAt: number }>
    /** totp secrets keyed by username */
    totp: Map<string, string>
    /** password overrides from reset flow */
    passwords: Map<string, string>
  } | undefined
}

function store() {
  if (!globalThis.__tlAuth) {
    globalThis.__tlAuth = {
      sessions: new Map(),
      pendingLogin: new Map(),
      totp: new Map(),
      passwords: new Map(),
    }
  }
  return globalThis.__tlAuth!
}

export const authStore = store
