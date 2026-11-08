/** Loan product catalog — list + create. */
export default defineEventHandler(async (event) => {
  const d = db()
  if (event.method === 'POST') {
    const b = await readBody<Record<string, any>>(event)
    if (!b.name) throw badRequest('Product name is required.')
    const product = {
      id: Math.max(0, ...d.loanProducts.map(p => p.id)) + 1,
      name: b.name, shortName: b.shortName || b.name.slice(0, 4).toUpperCase(),
      description: b.description ?? '',
      principalMin: Number(b.principalMin ?? 100), principalMax: Number(b.principalMax ?? 10000),
      interestRateMin: Number(b.interestRateMin ?? 5), interestRateMax: Number(b.interestRateMax ?? 30),
      termMin: Number(b.termMin ?? 4), termMax: Number(b.termMax ?? 24),
      termFrequency: b.termFrequency ?? 'months',
      repayEvery: Number(b.repayEvery ?? 1), repayFrequency: b.repayFrequency ?? 'months',
      graceOnPrincipal: Number(b.graceOnPrincipal ?? 0), active: true,
    }
    d.loanProducts.push(product)
    logAudit(d, 'Loan Product', 'CREATE', product.id, product.name)
    return { data: product, message: `Loan product "${product.name}" created.` }
  }
  const p = pageQuery(event)
  const items = [...d.loanProducts].sort((a, b) => a.id - b.id)
    .map(x => ({
      ...x,
      activeLoans: d.loans.filter(l => l.productId === x.id && l.status === 'active').length,
      outstanding: Math.round(d.loans.filter(l => l.productId === x.id && l.status === 'active').reduce((s, l) => s + l.outstanding, 0)),
    }))
  return paged(items.filter(x => !p.q || x.name.toLowerCase().includes(p.q)), p)
})
