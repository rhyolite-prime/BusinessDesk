/**
 * Executive dashboard KPIs — aggregated live from the mock core, so every
 * transaction made in the other modules moves these numbers.
 */
export default defineEventHandler(() => {
  const d = db()
  const t = todayISO()
  const monthStart = t.slice(0, 7) + '-01'

  const activeClients = d.clients.filter(c => c.status === 'active')
  const activeLoans = d.loans.filter(l => l.status === 'active')
  const outstanding = activeLoans.reduce((s, l) => s + l.outstanding, 0)
  const overdue = activeLoans.reduce((s, l) => s + l.overdueAmount, 0)
  const savingsBal = d.savings.filter(s => s.status === 'active' || s.status === 'dormant').reduce((s, a) => s + a.balance, 0)

  const disbursedThisMonth = d.loans
    .filter(l => l.disbursedDate && l.disbursedDate >= monthStart)
    .reduce((s, l) => s + l.principal, 0)
  const depositsThisMonth = d.savings.flatMap(s => s.transactions)
    .filter(x => x.type === 'deposit' && x.date >= monthStart)
    .reduce((s, x) => s + x.amount, 0)
  const newClients = d.clients.filter(c => c.activationDate && c.activationDate >= monthStart).length

  const glBal = (tag: string) => {
    const acct = d.glAccounts.find(a => a.tag === tag)!
    return glBalance(d, acct.id)
  }

  return {
    kpis: {
      totalClients: d.clients.length,
      activeClients: activeClients.length,
      pendingClients: d.clients.filter(c => c.status === 'pending').length,
      activeLoans: activeLoans.length,
      outstandingPortfolio: Math.round(outstanding),
      overduePortfolio: Math.round(overdue),
      parPct: outstanding > 0 ? overdue / outstanding : 0,
      savingsBalance: Math.round(savingsBal),
      savingsAccounts: d.savings.filter(s => s.status === 'active').length,
      disbursedThisMonth: Math.round(disbursedThisMonth),
      depositsThisMonth: Math.round(depositsThisMonth),
      newClientsThisMonth: newClients,
      pendingTasks: d.tasks.filter(x => x.status === 'pending').length,
      cashBalance: Math.round(glBal('CASH')),
    },
    portfolioByStatus: ['active', 'closed', 'submitted', 'approved', 'rejected', 'writtenoff']
      .map(s => ({ status: s, count: d.loans.filter(l => l.status === s).length })),
    portfolioByProduct: d.loanProducts.map(p => ({
      product: p.shortName,
      name: p.name,
      count: d.loans.filter(l => l.productId === p.id && (l.status === 'active')).length,
      outstanding: Math.round(d.loans.filter(l => l.productId === p.id && l.status === 'active').reduce((s, l) => s + l.outstanding, 0)),
    })).filter(x => x.count > 0).sort((a, b) => b.outstanding - a.outstanding),
    savingsByProduct: d.savingsProducts.map(p => ({
      product: p.shortName,
      name: p.name,
      accounts: d.savings.filter(s => s.productId === p.id && s.status !== 'closed').length,
      balance: Math.round(d.savings.filter(s => s.productId === p.id).reduce((s, x) => s + x.balance, 0)),
    })).filter(x => x.accounts > 0).sort((a, b) => b.balance - a.balance),
    recentActivity: d.audit.slice(0, 8),
    pendingTasks: d.tasks.filter(x => x.status === 'pending').slice(0, 6),
  }
})
