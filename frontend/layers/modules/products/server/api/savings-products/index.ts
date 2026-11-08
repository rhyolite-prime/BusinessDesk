/** Savings product catalog — list + create. */
export default defineEventHandler(async (event) => {
  const d = db()
  if (event.method === 'POST') {
    const b = await readBody<Record<string, any>>(event)
    if (!b.name) throw badRequest('Product name is required.')
    const product = {
      id: Math.max(0, ...d.savingsProducts.map(p => p.id)) + 1,
      name: b.name, shortName: b.shortName || b.name.slice(0, 4).toUpperCase(),
      description: b.description ?? '',
      type: b.type ?? 'savings',
      interestRate: Number(b.interestRate ?? 3),
      minOpeningBalance: Number(b.minOpeningBalance ?? 20),
      withdrawalFee: Number(b.withdrawalFee ?? 0),
      lockinDays: Number(b.lockinDays ?? 0), active: true,
    }
    d.savingsProducts.push(product)
    logAudit(d, 'Savings Product', 'CREATE', product.id, product.name)
    return { data: product, message: `Savings product "${product.name}" created.` }
  }
  const p = pageQuery(event)
  const items = [...d.savingsProducts].sort((a, b) => a.id - b.id)
    .map(x => ({
      ...x,
      activeAccounts: d.savings.filter(s => s.productId === x.id && s.status !== 'closed').length,
      deposits: Math.round(d.savings.filter(s => s.productId === x.id).reduce((sum, s) => sum + s.balance, 0)),
    }))
  return paged(items.filter(x => !p.q || x.name.toLowerCase().includes(p.q)), p)
})
