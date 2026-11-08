/** Client 360° view — profile + all linked accounts + groups + notes. */
export default defineEventHandler((event) => {
  const d = db()
  const id = Number(getRouterParam(event, 'id'))
  const c = d.clients.find(x => x.id === id)
  if (!c) throw notFound('Client not found')

  const loans = d.loans.filter(l => l.clientId === id).map(l => ({
    id: l.id, accountNo: l.accountNo, status: l.status, overdueAmount: l.overdueAmount,
    productName: d.loanProducts.find(p => p.id === l.productId)?.name ?? '',
    principal: l.principal, outstanding: l.outstanding,
    disbursedDate: l.disbursedDate, submittedDate: l.submittedDate,
  }))
  const savings = d.savings.filter(s => s.clientId === id).map(s => ({
    id: s.id, accountNo: s.accountNo, status: s.status, balance: s.balance,
    productName: d.savingsProducts.find(p => p.id === s.productId)?.name ?? '',
    activatedDate: s.activatedDate, interestRate: s.interestRate,
  }))
  const groups = d.groups.filter(g => g.memberIds.includes(id)).map(g => ({
    id: g.id, name: g.name, accountNo: g.accountNo, meetingDay: g.meetingDay,
    memberCount: g.memberIds.length,
  }))

  return {
    ...c,
    officeName: d.offices.find(o => o.id === c.officeId)?.name ?? '',
    staffName: d.staff.find(s => s.id === c.staffId)?.displayName ?? 'Unassigned',
    loans, savings, groups,
    totals: {
      loanOutstanding: Math.round(loans.reduce((s, l) => s + l.outstanding, 0)),
      savingsBalance: Math.round(savings.reduce((s, x) => s + x.balance, 0)),
    },
  }
})
