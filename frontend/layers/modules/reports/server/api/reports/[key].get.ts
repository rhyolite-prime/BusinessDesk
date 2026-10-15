/** Live report runner — all figures aggregate out of the mock core.
 *  Supports parameters: officeId, from, to (date range), plan/status groupings.
 */
export default defineEventHandler((event) => {
  const d = db()
  const key = String(getRouterParam(event, 'key'))
  const q = getQuery(event)
  const officeId = Number(q.officeId ?? 0)
  const from = String(q.from ?? '')
  const to = String(q.to ?? '')
  const t = todayISO()
  const inOffice = (oid: number) => !officeId || oid === officeId
  const inRange = (iso?: string | null) => {
    if (!iso) return !from && !to
    const v = iso.slice(0, 10)
    if (from && v < from) return false
    if (to && v > to) return false
    return true
  }
  const cname = (id: number) => d.clients.find(c => c.id === id)?.displayName ?? '—'
  const oname = (id: number) => d.offices.find(o => o.id === id)?.name ?? '—'
  const pname = (id: number) => d.loanProducts.find(p => p.id === id)?.shortName ?? '—'
  const spname = (id: number) => d.savingsProducts.find(p => p.id === id)?.shortName ?? '—'
  const sname = (id: number) => d.staff.find(s => s.id === id)?.displayName ?? '—'

  if (key === 'par') {
    const rows = d.loans.filter(l => l.status === 'active' && l.overdueAmount > 0 && inOffice(l.officeId))
      .filter(l => inRange(l.disbursedDate))
      .map(l => {
        const oldestUnpaid = l.schedule.filter(e => e.dueDate < t && e.totalDue - e.principalPaid - e.interestPaid - e.feesPaid > 0.01)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
        const dpd = oldestUnpaid ? Math.floor((Date.now() - new Date(oldestUnpaid.dueDate).getTime()) / 86400000) : 0
        return {
          accountNo: l.accountNo, client: cname(l.clientId), office: oname(l.officeId),
          officer: sname(l.staffId), product: pname(l.productId),
          outstanding: Math.round(l.outstanding), overdue: Math.round(l.overdueAmount), dpd,
        }
      }).sort((a, b) => b.dpd - a.dpd)
    const totalOverdue = rows.reduce((s, r) => s + r.overdue, 0)
    const totalOutstanding = d.loans.filter(l => l.status === 'active').reduce((s, l) => s + l.outstanding, 0)
    return {
      title: 'Portfolio at Risk (PAR > 30 days)',
      generatedAt: new Date().toISOString(),
      summary: [
        { label: 'PAR ratio', value: ((totalOverdue / totalOutstanding) * 100).toFixed(1) + '%' },
        { label: 'Amount at risk', value: 'GH₵ ' + totalOverdue.toLocaleString() },
        { label: 'Overdue accounts', value: rows.length },
        { label: 'Gross portfolio', value: 'GH₵ ' + Math.round(totalOutstanding).toLocaleString() },
      ],
      rows,
    }
  }

  if (key === 'collections') {
    const officers = d.staff.filter(s => s.isLoanOfficer && s.status === 'active' && inOffice(s.officeId))
    const monthStart = t.slice(0, 7) + '-01'
    const rows = officers.map(o => {
      const loans = d.loans.filter(l => l.staffId === o.id && l.status === 'active')
      let expected = 0, collected = 0
      for (const l of loans) {
        for (const e of l.schedule) {
          if (e.dueDate >= monthStart && e.dueDate <= t) {
            expected += e.totalDue
            collected += e.principalPaid + e.interestPaid + e.feesPaid -
              (l.schedule.filter(x => x.dueDate < monthStart).reduce((s, x) => s + x.principalPaid + x.interestPaid + x.feesPaid, 0))
          }
        }
      }
      // simpler: collected this month from transactions
      collected = loans.flatMap(l => l.transactions).filter(x => x.type === 'repayment' && x.date >= monthStart).reduce((s, x) => s + x.amount, 0)
      expected = loans.flatMap(l => l.schedule).filter(e => e.dueDate >= monthStart && e.dueDate <= t).reduce((s, e) => s + e.totalDue, 0)
      return {
        officer: o.displayName, office: oname(o.officeId),
        activeAccounts: loans.length,
        expected: Math.round(expected), collected: Math.round(collected),
        rate: expected > 0 ? Math.min(1, collected / expected) : 0,
      }
    }).filter(r => r.activeAccounts > 0).sort((a, b) => b.expected - a.expected)
    return {
      title: 'Collections Sheet — current month',
      generatedAt: new Date().toISOString(),
      summary: [
        { label: 'Expected this month', value: 'GH₵ ' + rows.reduce((s, r) => s + r.expected, 0).toLocaleString() },
        { label: 'Collected', value: 'GH₵ ' + rows.reduce((s, r) => s + r.collected, 0).toLocaleString() },
        { label: 'Collection rate', value: ((rows.reduce((s, r) => s + r.collected, 0) / Math.max(1, rows.reduce((s, r) => s + r.expected, 0))) * 100).toFixed(1) + '%' },
        { label: 'Officers reporting', value: rows.length },
      ],
      rows,
    }
  }

  if (key === 'trial-balance') {
    // office/date-scoped balances
    const rows = d.glAccounts.filter(a => a.usage === 'detail').map(a => {
      let bal = 0
      const debitNormal = a.type === 'ASSET' || a.type === 'EXPENSE'
      for (const j of d.journals) {
        if (j.reversed || j.glAccountId !== a.id) continue
        if (officeId && j.officeId !== officeId) continue
        if (!inRange(j.entryDate)) continue
        bal += j.entryType === 'DEBIT' ? j.amount : -j.amount
      }
      const signed = Math.round((debitNormal ? bal : -bal) * 100) / 100
      return {
        glCode: a.glCode, name: a.name, type: a.type,
        debit: signed > 0 ? Math.round(signed * 100) / 100 : 0,
        credit: signed < 0 ? Math.round(-signed * 100) / 100 : 0,
      }
    }).filter(r => r.debit > 0 || r.credit > 0).sort((a, b) => a.glCode.localeCompare(b.glCode))
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
    return {
      title: 'Trial Balance',
      generatedAt: new Date().toISOString(),
      summary: [
        { label: 'Total debits', value: 'GH₵ ' + Math.round(totalDebit).toLocaleString() },
        { label: 'Total credits', value: 'GH₵ ' + Math.round(totalCredit).toLocaleString() },
        { label: 'Net position', value: 'GH₵ ' + Math.round(totalDebit - totalCredit).toLocaleString() },
        { label: 'GL accounts in use', value: rows.length },
      ],
      rows,
    }
  }

  if (key === 'savings-portfolio') {
    const rows = d.savingsProducts.map(p => {
      const accts = d.savings.filter(s => s.productId === p.id && inOffice(s.officeId))
      return {
        product: p.shortName, name: p.name, rate: p.interestRate + '%',
        accounts: accts.filter(s => s.status !== 'closed').length,
        active: accts.filter(s => s.status === 'active').length,
        dormant: accts.filter(s => s.status === 'dormant').length,
        pending: accts.filter(s => s.status === 'submitted' || s.status === 'approved').length,
        balance: Math.round(accts.reduce((s, x) => s + x.balance, 0)),
      }
    }).filter(r => r.accounts > 0)
    return {
      title: 'Savings Portfolio by Product',
      generatedAt: new Date().toISOString(),
      summary: [
        { label: 'Total deposits', value: 'GH₵ ' + rows.reduce((s, r) => s + r.balance, 0).toLocaleString() },
        { label: 'Active accounts', value: rows.reduce((s, r) => s + r.active, 0) },
        { label: 'Dormant accounts', value: rows.reduce((s, r) => s + r.dormant, 0) },
        { label: 'Products live', value: rows.length },
      ],
      rows,
    }
  }

  if (key === 'loan-portfolio') {
    const rows = d.loanProducts.map(p => {
      const loans = d.loans.filter(l => l.productId === p.id && inOffice(l.officeId))
        .filter(l => inRange(l.disbursedDate))
      const active = loans.filter(l => l.status === 'active')
      return {
        product: p.shortName, name: p.name,
        accounts: active.length,
        disbursed: Math.round(loans.flatMap(l => l.transactions.filter(x => x.type === 'disbursement')).reduce((s, x) => s + x.amount, 0)),
        outstanding: Math.round(active.reduce((s, l) => s + l.outstanding, 0)),
        overdue: Math.round(active.reduce((s, l) => s + l.overdueAmount, 0)),
      }
    }).filter(r => r.accounts > 0 || r.disbursed > 0).sort((a, b) => b.outstanding - a.outstanding)
    return {
      title: 'Loan Portfolio by Product',
      generatedAt: new Date().toISOString(),
      summary: [
        { label: 'Gross outstanding', value: 'GH₵ ' + rows.reduce((s, r) => s + r.outstanding, 0).toLocaleString() },
        { label: 'Cumulative disbursed', value: 'GH₵ ' + rows.reduce((s, r) => s + r.disbursed, 0).toLocaleString() },
        { label: 'Arrears', value: 'GH₵ ' + rows.reduce((s, r) => s + r.overdue, 0).toLocaleString() },
        { label: 'Products active', value: rows.length },
      ],
      rows,
    }
  }

  if (key === 'branch-performance') {
    const rows = d.offices.filter(o => inOffice(o.id)).map(o => {
      const loans = d.loans.filter(l => l.officeId === o.id && l.status === 'active')
      return {
        office: o.name,
        clients: d.clients.filter(c => c.officeId === o.id).length,
        activeLoans: loans.length,
        portfolio: Math.round(loans.reduce((s, l) => s + l.outstanding, 0)),
        deposits: Math.round(d.savings.filter(s => s.officeId === o.id).reduce((s, x) => s + x.balance, 0)),
        staff: d.staff.filter(s => s.officeId === o.id && s.status === 'active').length,
      }
    })
    return {
      title: 'Branch Performance',
      generatedAt: new Date().toISOString(),
      summary: [
        { label: 'Branches', value: rows.length },
        { label: 'Total portfolio', value: 'GH₵ ' + rows.reduce((s, r) => s + r.portfolio, 0).toLocaleString() },
        { label: 'Total deposits', value: 'GH₵ ' + rows.reduce((s, r) => s + r.deposits, 0).toLocaleString() },
        { label: 'Clients', value: rows.reduce((s, r) => s + r.clients, 0) },
      ],
      rows,
    }
  }

  throw notFound('Unknown report: ' + key)
})
