interface AuthIdentityResponse {
  authenticated: boolean
  demo: boolean
  accountId?: string
  id?: number
  username?: string
  name?: string
  firstname?: string
  lastname?: string
  email?: string
  roleNames?: string[]
  officeId?: number
  officeName?: string
  permissions?: string[]
}

/**
 * Session-aware identity for the application chrome.
 * Mock sessions are created by the two-factor verification endpoint.
 */
export default defineEventHandler((event): AuthIdentityResponse => {
  const token = getCookie(event, 'tl_session')
  const session = token ? authStore().sessions.get(token) : undefined

  if (!session) {
    setResponseStatus(event, 401)
    return { authenticated: false, demo: false }
  }

  const d = db()
  const user = d.users.find((candidate) => candidate.id === session.userId)
  if (!user) {
    setResponseStatus(event, 401)
    return { authenticated: false, demo: false }
  }

  const office = d.offices.find((candidate) => candidate.id === user.officeId)
  return {
    authenticated: true,
    demo: true,
    accountId: 'DEMO-01',
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
