/**
 * Clients — list (Fineract-style paging + filters) and create.
 * GET  /api/clients?q=&status=&officeId=&staffId=&page=&size=
 * POST /api/clients  { firstname, lastname, clientType, officeId, ... }
 */
export default defineEventHandler(async (event) => {
  const d = db()

  if (event.method === 'POST') {
    const body = await readBody<Record<string, any>>(event)
    if (!body.firstname && !body.businessName) throw badRequest('A client name is required.')
    if (!body.mobile) throw badRequest('A mobile number is required for KYC.')
    const client = createClient(d, {
      ...body,
      officeId: Number(body.officeId) || d.currentUser.officeId,
      staffId: body.staffId ? Number(body.staffId) : null,
      gender: body.gender || '',
      activationDate: body.active === false || body.status === 'pending' ? null : (body.activationDate ?? todayISO()),
    })
    return { data: client, message: `Client ${client.accountNo} created successfully.` }
  }

  const p = pageQuery(event)
  const status = String(p.raw.status ?? '')
  const officeId = Number(p.raw.officeId ?? 0)
  const staffId = Number(p.raw.staffId ?? 0)
  const type = String(p.raw.type ?? '')

  let items = [...d.clients].sort((a, b) => (a.submittedDate < b.submittedDate ? 1 : -1))
  if (p.q) items = items.filter(c =>
    c.displayName.toLowerCase().includes(p.q) ||
    c.accountNo.toLowerCase().includes(p.q) ||
    c.mobile.includes(p.q) ||
    (c.businessName ?? '').toLowerCase().includes(p.q))
  if (status) items = items.filter(c => c.status === status)
  if (officeId) items = items.filter(c => c.officeId === officeId)
  if (staffId) items = items.filter(c => c.staffId === staffId)
  if (type) items = items.filter(c => c.clientType === type)

  const pageItems = items.slice((p.page - 1) * p.size, p.page * p.size).map(c => ({
    id: c.id, accountNo: c.accountNo, displayName: c.displayName, clientType: c.clientType,
    status: c.status, mobile: c.mobile, officeId: c.officeId, staffId: c.staffId,
    activationDate: c.activationDate, submittedDate: c.submittedDate, externalId: c.externalId,
    officeName: d.offices.find(o => o.id === c.officeId)?.name ?? '',
    staffName: d.staff.find(s => s.id === c.staffId)?.displayName ?? '—',
    loanCount: d.loans.filter(l => l.clientId === c.id).length,
    savingsCount: d.savings.filter(s => s.clientId === c.id).length,
  }))

  return { pageItems, totalFilteredCount: items.length, page: p.page, size: p.size }
})
