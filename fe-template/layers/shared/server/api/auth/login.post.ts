/**
 * Step 1 of login — username/password. Returns the 2FA challenge.
 * Demo credentials: any seeded user (e.g. a.mensah / demo1234).
 */
export default defineEventHandler(async (event) => {
  const d = db()
  const body = await readBody<{ username?: string; password?: string }>(event)
  const username = (body.username ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  const user = d.users.find(u => u.username.toLowerCase() === username)
  const pass = authStore().passwords.get(username)
  const demoPassword = pass ?? 'demo1234'
  if (!user || password !== demoPassword) {
    logAudit(d, 'Auth', 'LOGIN', 0, username, 'Invalid credentials', 'failure')
    throw badRequest('Invalid username or password.')
  }
  if (user.status === 'disabled') throw badRequest('This account has been disabled. Contact your administrator.')

  // issue a short-lived challenge token for the 2FA step
  const challengeId = crypto.randomUUID()
  authStore().pendingLogin.set(challengeId, { username, createdAt: Date.now() })
  logAudit(d, 'Auth', 'LOGIN_STEP1', user.id, `${user.firstname} ${user.lastname}`, 'Password OK — 2FA challenge')

  return {
    challenge: '2fa-required',
    challengeId,
    username: user.username,
    displayName: `${user.firstname} ${user.lastname}`,
    message: 'Password accepted — enter your authenticator code.',
  }
})
