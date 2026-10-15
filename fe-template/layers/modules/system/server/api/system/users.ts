/** Users — list + create. */
export default defineEventHandler(async (event) => {
  const d = db()

  if (event.method === 'POST') {
    const b = await readBody<Record<string, any>>(event)
    if (!b.username || !b.firstname || !b.lastname) throw badRequest('Username and full name are required.')
    if (d.users.some(u => u.username === b.username)) throw badRequest(`Username "${b.username}" already exists.`)
    const roleNames = (b.roleNames ?? ['Loan Officer']) as string[]
    const user = {
      id: Math.max(0, ...d.users.map(u => u.id)) + 1,
      username: b.username, firstname: b.firstname, lastname: b.lastname,
      email: b.email ?? `${b.username}@sikatrust.example`,
      officeId: Number(b.officeId) || 1,
      roleNames, status: 'active' as const,
      lastLogin: todayISO(),
    }
    d.users.push(user)
    logAudit(d, 'User', 'CREATE', user.id, user.username, `Roles: ${roleNames.join(', ')}`)
    return { data: user, message: `User ${user.username} created.` }
  }

  const p = pageQuery(event)
  let items = [...d.users].sort((a, b) => a.id - b.id)
  if (p.q) items = items.filter(u => u.username.toLowerCase().includes(p.q) || `${u.firstname} ${u.lastname}`.toLowerCase().includes(p.q))
  const decorated = items.map(u => ({
    ...u,
    officeName: d.offices.find(o => o.id === u.officeId)?.name ?? '—',
  }))
  return paged(decorated, p)
})
