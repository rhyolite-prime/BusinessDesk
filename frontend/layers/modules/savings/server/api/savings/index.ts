/**
 * Savings accounts — list + open application.
 * GET  /api/savings?q=&status=&productId=&page=&size=
 * POST /api/savings { clientId, productId }
 */
export default defineEventHandler(async (event) => {
  const d = db()

  if (event.method === 'POST') {
    const body = await readBody<Record<string, any>>(event)
    if (!body.clientId) throw badRequest('A client is required.')
    if (!body.productId) throw badRequest('A savings product is required.')
    const acc = createSavings(d, { clientId: Number(body.clientId), productId: Number(body.productId) })
    const client = d.clients.find(c => c.id === acc.clientId)
    return { data: acc, message: `Savings account ${acc.accountNo} opened for ${client?.displayName ?? 'client'} (pending approval).` }
  }

  const p = pageQuery(event)
  const status = String(p.raw.status ?? '')
  const productId = Number(p.raw.productId ?? 0)

  let items = [...d.savings].sort((a, b) => (a.submittedDate < b.submittedDate ? 1 : -1))
  if (p.q) items = items.filter(s => {
    const cname = d.clients.find(c => c.id === s.clientId)?.displayName.toLowerCase() ?? ''
    return s.accountNo.toLowerCase().includes(p.q) || cname.includes(p.q)
  })
  if (status) items = items.filter(s => s.status === status)
  if (productId) items = items.filter(s => s.productId === productId)

  const pageItems = items.slice((p.page - 1) * p.size, p.page * p.size).map(s => ({
    id: s.id, accountNo: s.accountNo, status: s.status, balance: s.balance,
    clientId: s.clientId,
    clientName: d.clients.find(c => c.id === s.clientId)?.displayName ?? '—',
    productName: d.savingsProducts.find(x => x.id === s.productId)?.name ?? '',
    interestRate: s.interestRate,
    activatedDate: s.activatedDate, submittedDate: s.submittedDate,
    officeName: d.offices.find(o => o.id === s.officeId)?.name ?? '',
  }))

  return { pageItems, totalFilteredCount: items.length, page: p.page, size: p.size }
})
