/** Fees & penalties (Fineract "Charges") — list + create. */
export default defineEventHandler(async (event) => {
  const d = db()
  if (event.method === 'POST') {
    const b = await readBody<Record<string, any>>(event)
    if (!b.name) throw badRequest('Charge name is required.')
    const charge = {
      id: Math.max(0, ...d.charges.map(c => c.id)) + 1,
      name: b.name, chargeType: b.chargeType ?? 'fee', appliesTo: b.appliesTo ?? 'loan',
      amountMode: b.amountMode ?? 'flat',
      amount: Number(b.amount ?? 0), due: b.due ?? 'specified', active: true,
    }
    d.charges.push(charge)
    logAudit(d, 'Charge', 'CREATE', charge.id, charge.name)
    return { data: charge, message: `Charge "${charge.name}" created.` }
  }
  const p = pageQuery(event)
  const items = [...d.charges].sort((a, b) => a.id - b.id)
  return paged(items.filter(x => !p.q || x.name.toLowerCase().includes(p.q)), p)
})
