/** Offices — list (with branch KPIs) + create. */
export default defineEventHandler(async (event) => {
  const d = db()

  if (event.method === 'POST') {
    const b = await readBody<Record<string, any>>(event)
    if (!b.name) throw badRequest('Office name is required.')
    const office = {
      id: Math.max(0, ...d.offices.map(o => o.id)) + 1,
      name: b.name, parentId: b.parentId ? Number(b.parentId) : 1,
      openingDate: b.openingDate || todayISO(),
      externalId: 'OFF-NEW-' + Math.floor(Math.random() * 9000 + 1000),
      status: 'active' as const,
    }
    d.offices.push(office)
    logAudit(d, 'Office', 'CREATE', office.id, office.name)
    return { data: office, message: `Office "${office.name}" created.` }
  }

  const p = pageQuery(event)
  const items = d.offices.map(o => ({
    ...o,
    parentName: d.offices.find(x => x.id === o.parentId)?.name ?? '—',
    clients: d.clients.filter(c => c.officeId === o.id).length,
    staff: d.staff.filter(s => s.officeId === o.id).length,
    loans: d.loans.filter(l => l.officeId === o.id).length,
    portfolio: Math.round(d.loans.filter(l => l.officeId === o.id && l.status === 'active').reduce((s, l) => s + l.outstanding, 0)),
    deposits: Math.round(d.savings.filter(s => s.officeId === s.officeId && o.id === s.officeId).reduce((s2, x) => s2 + x.balance, 0)),
  }))
  return paged(items.filter(o => !p.q || o.name.toLowerCase().includes(p.q)), p)
})
