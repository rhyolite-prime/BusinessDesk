/**
 * Loan accounts — list + originate.
 * GET  /api/loans?q=&status=&productId=&officeId=&overdue=&page=&size=
 * POST /api/loans { clientId, productId, principal, term, purpose, ... }
 */
export default defineEventHandler(async (event) => {
  const d = db()

  if (event.method === 'POST') {
    const body = await readBody<Record<string, any>>(event)
    if (!body.clientId) throw badRequest('A client is required.')
    if (!body.productId) throw badRequest('A loan product is required.')
    const loan = createLoan(d, {
      clientId: Number(body.clientId),
      productId: Number(body.productId),
      principal: Number(body.principal),
      term: Number(body.term) || undefined,
      interestRate: body.interestRate ? Number(body.interestRate) : undefined,
      purpose: body.purpose, collateral: body.collateral, guarantor: body.guarantor,
    })
    const client = d.clients.find(c => c.id === loan.clientId)
    return { data: loan, message: `Loan application ${loan.accountNo} submitted for ${client?.displayName ?? 'client'}.` }
  }

  const p = pageQuery(event)
  const status = String(p.raw.status ?? '')
  const productId = Number(p.raw.productId ?? 0)
  const overdueOnly = String(p.raw.overdue ?? '') === 'true'

  let items = [...d.loans].sort((a, b) => (a.submittedDate < b.submittedDate ? 1 : -1))
  if (p.q) items = items.filter(l => {
    const cname = d.clients.find(c => c.id === l.clientId)?.displayName.toLowerCase() ?? ''
    return l.accountNo.toLowerCase().includes(p.q) || cname.includes(p.q)
  })
  if (status) items = items.filter(l => l.status === status)
  if (productId) items = items.filter(l => l.productId === productId)
  if (overdueOnly) items = items.filter(l => l.status === 'active' && l.overdueAmount > 0)

  const pageItems = items.slice((p.page - 1) * p.size, p.page * p.size).map(l => ({
    id: l.id, accountNo: l.accountNo, status: l.status, overdueAmount: l.overdueAmount,
    clientId: l.clientId,
    clientName: d.clients.find(c => c.id === l.clientId)?.displayName ?? '—',
    productName: d.loanProducts.find(x => x.id === l.productId)?.name ?? '',
    principal: l.principal, outstanding: l.outstanding,
    interestRate: l.interestRate, term: l.term, termFrequency: l.termFrequency,
    disbursedDate: l.disbursedDate, submittedDate: l.submittedDate,
    officeName: d.offices.find(o => o.id === l.officeId)?.name ?? '',
    staffName: d.staff.find(s => s.id === l.staffId)?.displayName ?? '—',
  }))

  return { pageItems, totalFilteredCount: items.length, page: p.page, size: p.size }
})
