/**
 * Chart of accounts — list (with live GL balances from the journal)
 * and create manual GL account.
 */
export default defineEventHandler(async (event) => {
  const d = db()

  if (event.method === 'POST') {
    const b = await readBody<Record<string, any>>(event)
    if (!b.name || !b.glCode || !b.type) throw badRequest('GL code, name and type are required.')
    if (d.glAccounts.some(a => a.glCode === b.glCode)) throw badRequest(`GL code ${b.glCode} already exists.`)
    const acct = {
      id: Math.max(0, ...d.glAccounts.map(a => a.id)) + 1,
      glCode: b.glCode, name: b.name, type: b.type,
      parentId: b.parentId ? Number(b.parentId) : null,
      usage: b.usage ?? 'detail', tag: b.tag ?? '', manualEntriesAllowed: b.manualEntriesAllowed !== false,
      description: b.description ?? '',
    }
    d.glAccounts.push(acct)
    logAudit(d, 'GL Account', 'CREATE', acct.id, `${acct.glCode} — ${acct.name}`)
    return { data: acct, message: `GL account ${acct.glCode} created.` }
  }

  const p = pageQuery(event)
  const type = String(p.raw.type ?? '')
  let items = d.glAccounts.map(a => ({
    ...a,
    balance: glBalance(d, a.id),
    parentName: d.glAccounts.find(p2 => p2.id === a.parentId)?.name ?? '',
    manualEntriesCount: d.journals.filter(j => j.glAccountId === a.id).length,
  }))
  if (type) items = items.filter(a => a.type === type)
  const totalByType = (t: string) => Math.round(items.filter(a => a.type === t && a.usage === 'detail').reduce((s, a) => s + Math.max(0, a.balance), 0))
  return {
    pageItems: items,
    totals: {
      assets: totalByType('ASSET'), liabilities: totalByType('LIABILITY'),
      equity: totalByType('EQUITY'), income: totalByType('INCOME'), expenses: totalByType('EXPENSE'),
    },
  }
})
