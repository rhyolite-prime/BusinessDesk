/** Groups & solidarity circles — list. */
export default defineEventHandler((event) => {
  const d = db()
  const p = pageQuery(event)
  let items = [...d.groups].sort((a, b) => (a.formationDate < b.formationDate ? 1 : -1))
  if (p.q) items = items.filter(g => g.name.toLowerCase().includes(p.q) || g.accountNo.toLowerCase().includes(p.q))
  if (p.raw.officeId) items = items.filter(g => g.officeId === Number(p.raw.officeId))
  if (p.raw.status) items = items.filter(g => g.status === p.raw.status)

  const pageItems = items.slice((p.page - 1) * p.size, p.page * p.size).map(g => ({
    id: g.id, name: g.name, accountNo: g.accountNo, status: g.status,
    meetingDay: g.meetingDay, formationDate: g.formationDate, memberCount: g.memberIds.length,
    officeName: d.offices.find(o => o.id === g.officeId)?.name ?? '',
    staffName: d.staff.find(s => s.id === g.staffId)?.displayName ?? '—',
    portfolio: Math.round(d.loans.filter(l => g.memberIds.includes(l.clientId) && l.status === 'active').reduce((s, l) => s + l.outstanding, 0)),
    savings: Math.round(d.savings.filter(s => g.memberIds.includes(s.clientId) && s.status === 'active').reduce((s, x) => s + x.balance, 0)),
  }))
  return { pageItems, totalFilteredCount: items.length, page: p.page, size: p.size }
})
