/**
 * Loan lifecycle actions (all audited + double-entry posted where money moves):
 *   approve | reject | withdraw | disburse | repayment | writeoff
 */
export default defineEventHandler(async (event) => {
  const d = db()
  const id = Number(getRouterParam(event, 'id'))
  const action = String(getRouterParam(event, 'action'))
  const body = await readBody<Record<string, any>>(event)
  const loan = loanAction(d, id, action, body ?? {})
  const amt = body?.amount ? Number(body.amount).toLocaleString() : loan.principal.toLocaleString()
  return { data: loan, message: {
    approve: `Loan ${loan.accountNo} approved and awaits disbursal.`,
    reject: `Loan ${loan.accountNo} rejected.`,
    withdraw: `Loan application ${loan.accountNo} withdrawn.`,
    disburse: `Loan ${loan.accountNo} disbursed — ${amt} released.`,
    repayment: `Repayment of ${amt} posted to ${loan.accountNo}.`,
    writeoff: `Loan ${loan.accountNo} written off per credit policy.`,
  }[action] ?? 'Action completed.' }
})
