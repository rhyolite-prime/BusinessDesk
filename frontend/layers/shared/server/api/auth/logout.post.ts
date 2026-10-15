/** Destroy the current session. */
export default defineEventHandler((event) => {
  const token = getCookie(event, 'tl_session')
  if (token) authStore().sessions.delete(token)
  deleteCookie(event, 'tl_session', { path: '/' })
  deleteCookie(event, 'tl_authed', { path: '/' })
  return { ok: true }
})
