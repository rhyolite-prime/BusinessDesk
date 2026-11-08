/** Loan account detail: schedule, transactions, collateral, lifecycle. */
export default defineEventHandler((event) => {
  const d = db()
  const id = Number(getRouterParam(event, 'id'))
  const l = d.loans.find(x => x.id === id)
  if (!l) throw notFound('Loan account not found')

  const today = todayISO()
  const schedule = l.schedule.map(e => {
    const remaining = Math.round((e.totalDue - e.principalPaid - e.interestPaid - e.feesPaid) * 100) / 100
    let rowStatus = 'upcoming'
    if (remaining <= 0.01) rowStatus = 'paid'
    else if (e.paidDate || remaining > 0 && (e.principalPaid + e.interestPaid + e.feesPaid) > 0) rowStatus = 'partial'
    else if (e.dueDate < today && l.status === 'active') rowStatus = 'overdue'
    else if (e.dueDate < today) rowStatus = 'due'
    return { ...e, remaining, rowStatus }
  })

  return {
    ...l,
    clientName: d.clients.find(c => c.id === l.clientId)?.displayName ?? '—',
    clientAccountNo: d.clients.find(c => c.id === l.clientId)?.accountNo ?? '',
    productName: d.loanProducts.find(x => x.id === l.productId)?.name ?? '',
    officeName: d.offices.find(o => o.id === l.officeId)?.name ?? '',
    staffName: d.staff.find(s => s.id === l.staffId)?.displayName ?? '—',
    schedule,
    transactions: [...l.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)),
    paymentTypes: d.paymentTypes.map(t => t.name),
    nextDue: schedule.find(e => e.remaining > 0.01)?.dueDate ?? null,
  }
})
