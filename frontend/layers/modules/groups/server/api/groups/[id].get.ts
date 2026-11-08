/** Group detail with member roster and aggregate portfolio. */
export default defineEventHandler((event) => {
  const d = db()
  const id = Number(getRouterParam(event, 'id'))
  const g = d.groups.find(x => x.id === id)
  if (!g) throw notFound('Group not found')

  const members = g.memberIds.map(cid => {
    const c = d.clients.find(x => x.id === cid)!
    return {
      id: c.id, accountNo: c.accountNo, displayName: c.displayName, status: c.status,
      mobile: c.mobile,
      loans: d.loans.filter(l => l.clientId === cid).length,
      savingsBalance: Math.round(d.savings.filter(s => s.clientId === cid).reduce((s, x) => s + x.balance, 0)),
      loanOutstanding: Math.round(d.loans.filter(l => l.clientId === cid && l.status === 'active').reduce((s, l) => s + l.outstanding, 0)),
    }
  })

  return {
    id: g.id, name: g.name, accountNo: g.accountNo, status: g.status,
    meetingDay: g.meetingDay, formationDate: g.formationDate,
    officeName: d.offices.find(o => o.id === g.officeId)?.name ?? '',
    staffName: d.staff.find(s => s.id === g.staffId)?.displayName ?? '—',
    members,
    totals: {
      memberCount: members.length,
      activeMembers: members.filter(m => m.status === 'active').length,
      portfolio: Math.round(members.reduce((s, m) => s + m.loanOutstanding, 0)),
      savings: Math.round(members.reduce((s, m) => s + m.savingsBalance, 0)),
    },
  }
})
