/**
 * Journal entries — list (filter by account / date / transaction) and
 * post a manual double-entry voucher (debits must equal credits).
 */
export default defineEventHandler(async (event) => {
  const d = db()

  if (event.method === 'POST') {
    const b = await readBody<Record<string, any>>(event)
    const lines: { glAccountId: number; debit: number; credit: number }[] = b.lines ?? []
    if (lines.length < 2) throw badRequest('A voucher needs at least two GL lines.')
    const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0)
    if (Math.abs(totalDebit - totalCredit) > 0.01) throw badRequest(`Voucher unbalanced: debits ${totalDebit.toFixed(2)} ≠ credits ${totalCredit.toFixed(2)}.`)
    if (totalDebit <= 0) throw badRequest('Voucher total must be greater than zero.')

    const txId = 'JE-' + String(600000 + Math.max(0, ...d.journals.map(j => j.id)) + 1)
    const date = b.date || todayISO()
    for (const l of lines) {
      const acct = d.glAccounts.find(a => a.id === Number(l.glAccountId))
      if (!acct) throw badRequest(`GL account ${l.glAccountId} not found.`)
      if (!acct.manualEntriesAllowed) throw badRequest(`Manual entries are not allowed on ${acct.glCode} ${acct.name}.`)
      const amt = Number(l.debit || l.credit)
      if (amt <= 0) continue
      d.journals.push({
        id: 0, transactionId: txId, entryDate: date,
        officeId: Number(b.officeId) || d.currentUser.officeId,
        glAccountId: acct.id, amount: Math.round(amt * 100) / 100,
        entryType: l.debit ? 'DEBIT' : 'CREDIT',
        note: b.note ?? 'Manual journal entry', reversed: false, user: d.currentUser.username,
      })
    }
    d.journals.forEach((j, i) => { j.id = i + 1 })
    logAudit(d, 'Journal Entry', 'POST', 0, txId, `${totalDebit.toFixed(2)} — ${b.note ?? 'manual voucher'}`)
    return { data: { transactionId: txId }, message: `Voucher ${txId} posted (${totalDebit.toFixed(2)}).` }
  }

  const p = pageQuery(event)
  const glAccountId = Number(p.raw.glAccountId ?? 0)
  const from = String(p.raw.from ?? '')
  const to = String(p.raw.to ?? '')

  let items = [...d.journals].sort((a, b2) => (a.entryDate < b2.entryDate ? 1 : -1))
  if (glAccountId) items = items.filter(j => j.glAccountId === glAccountId)
  if (from) items = items.filter(j => j.entryDate >= from)
  if (to) items = items.filter(j => j.entryDate <= to)

  const decorated = items.map(j => ({
    ...j,
    glAccountName: d.glAccounts.find(a => a.id === j.glAccountId)?.name ?? '?',
    glCode: d.glAccounts.find(a => a.id === j.glAccountId)?.glCode ?? '?',
    glType: d.glAccounts.find(a => a.id === j.glAccountId)?.type ?? '',
    officeName: d.offices.find(o => o.id === j.officeId)?.name ?? '—',
    userName: j.user === 'system.seed' ? 'System (auto-post)' : d.users.find(u => u.username === j.user)?.firstname + ' ' + d.users.find(u => u.username === j.user)?.lastname,
  }))
  const pageItems = decorated.slice((p.page - 1) * p.size, p.page * p.size)
  return { pageItems, totalFilteredCount: decorated.length, page: p.page, size: p.size }
})
