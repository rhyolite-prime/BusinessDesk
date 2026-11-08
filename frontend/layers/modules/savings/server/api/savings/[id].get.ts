/** Savings account detail: ledger transactions, product terms, linked client. */
export default defineEventHandler((event) => {
  const d = db()
  const id = Number(getRouterParam(event, 'id'))
  const s = d.savings.find(x => x.id === id)
  if (!s) throw notFound('Savings account not found')

  return {
    ...s,
    clientName: d.clients.find(c => c.id === s.clientId)?.displayName ?? '—',
    clientAccountNo: d.clients.find(c => c.id === s.clientId)?.accountNo ?? '',
    clientMobile: d.clients.find(c => c.id === s.clientId)?.mobile ?? '',
    productName: d.savingsProducts.find(x => x.id === s.productId)?.name ?? '',
    product: d.savingsProducts.find(x => x.id === s.productId),
    officeName: d.offices.find(o => o.id === s.officeId)?.name ?? '',
    staffName: d.staff.find(x => x.id === s.staffId)?.displayName ?? '—',
    transactions: [...s.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)),
    paymentTypes: d.paymentTypes.map(t => t.name),
  }
})
