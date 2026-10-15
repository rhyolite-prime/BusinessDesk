/** Checker decision — approve applies the queued effect to the real entity. */
export default defineEventHandler(async (event) => {
  const d = db()
  const id = Number(getRouterParam(event, 'id'))
  const action = String(getRouterParam(event, 'action'))
  const body = await readBody<{ note?: string }>(event)

  if (action !== 'approve' && action !== 'reject') throw badRequest(`Unknown checker action: ${action}`)
  const task = resolveTask(d, id, action, body?.note ?? '')
  return { data: task, message: `Task ${action}d — ${task.entityLabel}` }
})
