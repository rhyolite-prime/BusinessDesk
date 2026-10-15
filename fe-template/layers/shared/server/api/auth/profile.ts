/** Current user profile — GET to read, PUT to update. */
export default defineEventHandler(async (event) => {
  const d = db()
  const token = getCookie(event, 'tl_session')
  const session = token ? authStore().sessions.get(token) : undefined
  const user = d.users.find(u => u.id === (session?.userId ?? d.currentUser.id))
  if (!user) throw badRequest('Not signed in.')
  const office = d.offices.find(o => o.id === user.officeId)

  if (event.method === 'PUT') {
    const b = await readBody<Record<string, any>>(event)
    user.firstname = b.firstname ?? user.firstname
    user.lastname = b.lastname ?? user.lastname
    user.email = b.email ?? user.email
    if (b.mobile) (user as any).mobile = b.mobile
    logAudit(d, 'User', 'PROFILE_UPDATE', user.id, user.username, 'Profile updated')
  }

  return {
    id: user.id,
    username: user.username,
    name: `${user.firstname} ${user.lastname}`,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    mobile: (user as any).mobile ?? '',
    officeId: user.officeId,
    officeName: office?.name ?? '',
    roleNames: user.roleNames,
    hasTotp: authStore().totp.has(user.username),
  }
})
