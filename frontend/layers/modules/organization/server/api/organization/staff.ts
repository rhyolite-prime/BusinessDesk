/** Staff / employees — list + create. */
export default defineEventHandler(async (event) => {
  const d = db()

  if (event.method === 'POST') {
    const b = await readBody<Record<string, any>>(event)
    if (!b.firstname || !b.lastname) throw badRequest('First and last name are required.')
    const staff = {
      id: Math.max(0, ...d.staff.map(s => s.id)) + 1,
      firstname: b.firstname, lastname: b.lastname,
      displayName: `${b.firstname} ${b.lastname}`,
      officeId: Number(b.officeId) || 1,
      isLoanOfficer: Boolean(b.isLoanOfficer),
      position: b.position ?? 'Loan Officer',
      mobile: b.mobile ?? '',
      status: 'active' as const,
    }
    d.staff.push(staff)
    logAudit(d, 'Staff', 'CREATE', staff.id, staff.displayName)
    return { data: staff, message: `${staff.displayName} added.` }
  }

  const p = pageQuery(event)
  let items = [...d.staff].sort((a, b) => a.displayName.localeCompare(b.displayName))
  if (p.q) items = items.filter(s => s.displayName.toLowerCase().includes(p.q))
  if (p.raw.officeId) items = items.filter(s => s.officeId === Number(p.raw.officeId))
  if (p.raw.loanOfficers === 'true') items = items.filter(s => s.isLoanOfficer)

  const decorated = items.map(s => ({
    ...s,
    officeName: d.offices.find(o => o.id === s.officeId)?.name ?? '—',
    clients: d.clients.filter(c => c.staffId === s.id).length,
    activeLoans: d.loans.filter(l => l.staffId === s.id && l.status === 'active').length,
    portfolio: Math.round(d.loans.filter(l => l.staffId === s.id && l.status === 'active').reduce((sum, l) => sum + l.outstanding, 0)),
  }))
  return paged(decorated, p)
})
