/** Office holidays — list + create. */
export default defineEventHandler(async (event) => {
  const d = db()

  if (event.method === 'POST') {
    const b = await readBody<Record<string, any>>(event)
    if (!b.name || !b.fromDate) throw badRequest('Holiday name and from-date are required.')
    const holiday: Holiday = {
      id: Math.max(0, ...d.holidays.map(h => h.id)) + 1,
      name: b.name, description: b.description ?? '',
      fromDate: b.fromDate, toDate: b.toDate || b.fromDate,
      officeId: Number(b.officeId) || 1,
      status: 'active',
    }
    d.holidays.push(holiday)
    logAudit(d, 'Holiday', 'CREATE', holiday.id, holiday.name)
    return { data: holiday, message: `Holiday "${holiday.name}" scheduled.` }
  }

  const p = pageQuery(event)
  const items = [...d.holidays].sort((a, b) => (a.fromDate < b.fromDate ? 1 : -1))
    .map(h => ({ ...h, officeName: d.offices.find(o => o.id === h.officeId)?.name ?? 'All offices' }))
  return paged(items, p)
})
