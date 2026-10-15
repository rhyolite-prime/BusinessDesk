/** Reset the signed-in user's password (mock). */
export default defineEventHandler(async (event) => {
  const d = db()
  const body = await readBody<{ current?: string; next?: string }>(event)
  const token = getCookie(event, 'tl_session')
  const session = token ? authStore().sessions.get(token) : undefined
  const user = d.users.find(u => u.id === (session?.userId ?? d.currentUser.id))
  if (!user) throw badRequest('Not signed in.')

  const st = authStore()
  const current = st.passwords.get(user.username) ?? 'demo1234'
  if ((body.current ?? '') !== current) throw badRequest('Current password is incorrect.')
  if (!body.next || body.next.length < 6) throw badRequest('New password must be at least 6 characters.')

  st.passwords.set(user.username, body.next)
  logAudit(d, 'User', 'PASSWORD_RESET', user.id, user.username, 'Password changed')
  return { ok: true, message: 'Password updated successfully.' }
})
