/**
 * Savings lifecycle & cash actions:
 *   approve | activate | deposit | withdraw | close
 */
export default defineEventHandler(async (event) => {
  const d = db()
  const id = Number(getRouterParam(event, 'id'))
  const action = String(getRouterParam(event, 'action'))
  const body = await readBody<Record<string, any>>(event)
  const acc = savingsAction(d, id, action, body)
  const messages: Record<string, string> = {
    approve: `Account ${acc.accountNo} approved and ready for activation.`,
    activate: `Account ${acc.accountNo} activated with opening deposit.`,
    deposit: `Deposit posted to ${acc.accountNo}. New balance ${acc.balance.toLocaleString()}.`,
    withdraw: `Withdrawal from ${acc.accountNo} processed. New balance ${acc.balance.toLocaleString()}.`,
    close: `Account ${acc.accountNo} closed.`,
  }
  return { data: acc, message: messages[action] ?? 'Action completed.' }
})
