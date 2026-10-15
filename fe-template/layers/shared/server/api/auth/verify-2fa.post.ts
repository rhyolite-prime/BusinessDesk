/**
 * Step 2 of login — verify the Google Authenticator code, then create
 * the session cookie.
 */
export default defineEventHandler(async (event) => {
  const d = db()
  const body = await readBody<{ challengeId?: string; code?: string }>(event)
  const st = authStore()

  const pending = st.pendingLogin.get(body.challengeId ?? '')
  if (!pending) throw badRequest('Login session expired. Please sign in again.')
  // challenges are valid for 10 minutes
  if (Date.now() - pending.createdAt > 10 * 60 * 1000) {
    st.pendingLogin.delete(body.challengeId!)
    throw badRequest('Login session expired. Please sign in again.')
  }

  let secret = st.totp.get(pending.username)
  // first-time enrolment: auto-provision a secret so the demo works end to end
  if (!secret) {
    secret = generateTotpSecret()
    st.totp.set(pending.username, secret)
  }

  if (!verifyTotp(secret, body.code ?? '')) {
    logAudit(d, 'Auth', 'LOGIN_2FA', 0, pending.username, 'Invalid authenticator code', 'failure')
    throw badRequest('Invalid authenticator code. Please try again.')
  }

  const user = d.users.find(u => u.username.toLowerCase() === pending.username)
  if (!user) throw badRequest('User no longer exists.')

  st.pendingLogin.delete(body.challengeId!)
  const token = crypto.randomUUID()
  st.sessions.set(token, { userId: user.id, username: user.username, issuedAt: Date.now() })

  setCookie(event, 'tl_session', token, {
    httpOnly: true, sameSite: 'lax', path: '/',
    maxAge: 60 * 60 * 12, // 12 hours
  })
  // Companion flag (carries NO credential) so the client-side route guard
  // can know a session exists — the real token stays httpOnly.
  setCookie(event, 'tl_authed', '1', {
    httpOnly: false, sameSite: 'lax', path: '/',
    maxAge: 60 * 60 * 12,
  })
  logAudit(d, 'Auth', 'LOGIN', user.id, `${user.firstname} ${user.lastname}`, 'Signed in with 2FA')

  return {
    authenticated: true,
    user: { id: user.id, username: user.username, name: `${user.firstname} ${user.lastname}` },
  }
})
