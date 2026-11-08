/** 12-month portfolio movement: disbursements, repayments, deposits. */
export default defineEventHandler(() => {
  const d = db()
  const months: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: dt.toISOString().slice(0, 7),
      label: dt.toLocaleString('en', { month: 'short' }),
    })
  }
  const bucket = <T,>(items: T[], dateFn: (x: T) => string | null | undefined, amountFn: (x: T) => number) =>
    months.map(m => Math.round(items
      .filter(x => (dateFn(x) ?? '').slice(0, 7) === m.key)
      .reduce((s, x) => s + amountFn(x), 0)))

  const disbursements = bucket(d.loans, l => l.transactions.find(t => t.type === 'disbursement')?.date, () => 0)
  // disbursement amounts per month
  months.forEach((m, i) => {
    disbursements[i] = Math.round(d.loans
      .flatMap(l => l.transactions.filter(t => t.type === 'disbursement'))
      .filter(t => t.date.slice(0, 7) === m.key)
      .reduce((s, t) => s + t.amount, 0))
  })
  const repayments = months.map(m => Math.round(d.loans
    .flatMap(l => l.transactions.filter(t => t.type === 'repayment'))
    .filter(t => t.date.slice(0, 7) === m.key)
    .reduce((s, t) => s + t.amount, 0)))
  const deposits = months.map(m => Math.round(d.savings
    .flatMap(s => s.transactions.filter(t => t.type === 'deposit'))
    .filter(t => t.date.slice(0, 7) === m.key)
    .reduce((s, t) => s + t.amount, 0)))
  const newClients = months.map(m => d.clients.filter(c => c.activationDate?.slice(0, 7) === m.key).length)

  return {
    labels: months.map(m => m.label),
    disbursements, repayments, deposits, newClients,
  }
})
