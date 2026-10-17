/** Client lifecycle actions: activate / close. */
export default defineEventHandler(async (event) => {
  const d = db()
  const id = Number(getRouterParam(event, 'id'))
  const action = String(getRouterParam(event, 'action'))
  if (action !== 'activate' && action !== 'close') throw badRequest(`Unknown client action: ${action}`)
  const client = clientAction(d, id, action)
  return { data: client, message: action === 'activate' ? `Client ${client.accountNo} activated.` : `Client ${client.accountNo} closed.` }
})
