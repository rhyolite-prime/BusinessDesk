/**
 * Platform signup — provisions a new institution tenant + administrator.
 * In production this would call the platform provisioning API and spin up
 * a tenant database; here it creates an office and a super-user account.
 */
export default defineEventHandler(async (event) => {
  const d = db()
  const b = await readBody<Record<string, any>>(event)
  const institution = (b.institution ?? '').trim()
  const fullname = (b.fullname ?? '').trim()
  const email = (b.email ?? '').trim().toLowerCase()
  const password = b.password ?? ''

  if (!institution) throw badRequest('Institution name is required.')
  if (!fullname) throw badRequest('Your name is required.')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw badRequest('A valid work email is required.')
  if (password.length < 8) throw badRequest('Password must be at least 8 characters.')
  if (!b.totpSecret) throw badRequest('2FA enrolment is required.')

  const username = email.split('@')[0].replace(/[^a-z0-9.]/g, '.')
  if (d.users.some(u => u.email.toLowerCase() === email || u.username.toLowerCase() === username)) {
    throw badRequest('An account with this email already exists.')
  }

  // provision the tenant office
  const office = {
    id: Math.max(0, ...d.offices.map(o => o.id)) + 1,
    name: `${institution} — Head Office`,
    parentId: null, openingDate: todayISO(),
    externalId: `OFF-${institution.slice(0, 4).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    status: 'active' as const,
  }
  d.offices.push(office)

  const [firstname, ...rest] = fullname.split(' ')
  const user = {
    id: Math.max(0, ...d.users.map(u => u.id)) + 1,
    username, firstname: firstname || 'Admin', lastname: rest.join(' ') || 'User',
    email, officeId: office.id, roleNames: ['Super User'] as string[],
    status: 'active' as const, lastLogin: todayISO(),
  }
  d.users.push(user)
  const st = authStore()
  st.passwords.set(username, password)
  st.totp.set(username, b.totpSecret)
  logAudit(d, 'Tenant', 'SIGNUP', office.id, institution, `Tenant provisioned for ${email} (admin: ${username})`)

  return {
    ok: true,
    username,
    institution,
    officeId: office.id,
    message: `${institution} provisioned. Sign in with ${username} and your new password.`,
  }
})
