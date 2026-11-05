const ACCOUNT_ID_KEY = 'businessdesk.accountId'

/** Browser-only convenience value; never an authenticated identity. */
export function loadRememberedAccountId(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(ACCOUNT_ID_KEY)?.trim() || ''
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
    return ''
  }
}

export function saveRememberedAccountId(accountId: string): void {
  if (typeof window === 'undefined') return
  try {
    const value = accountId.trim()
    if (value) window.localStorage.setItem(ACCOUNT_ID_KEY, value)
    else window.localStorage.removeItem(ACCOUNT_ID_KEY)
  } catch {
    // A storage restriction/quota must not prevent sign-in.
  }
}
