/**
 * Session-aware identity for the console chrome.
 * Mock session is the `tl_session` cookie set at the 2FA step.
 */
export default defineEventHandler((event) => {
  const d = db()
  const token = getCookie(event, 'tl_session')
  const session = token ? authStore().sessions.get(token) : undefined
  const user = d.users.find(x => x.id === (session?.userId ?? d.currentUser.id))
  if (!user) {
    // not signed in (used by client to route to /login)
    setResponseStatus(event, 401)
    return { authenticated: false }
  }
  const office = d.offices.find(o => o.id === user.officeId)
  return {
    authenticated: true,
    id: user.id,
    username: user.username,
    name: `${user.firstname} ${user.lastname}`,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    roleNames: user.roleNames,
    officeId: user.officeId,
    officeName: office?.name ?? '',
    permissions: ['*'],
  }
})
