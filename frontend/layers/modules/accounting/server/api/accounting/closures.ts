/** Accounting period closures — list + create (close the books for an office/period). */
export default defineEventHandler(async (event) => {
  const d = db()

  if (event.method === 'POST') {
    const b = await readBody<Record<string, any>>(event)
    const closure = {
      id: Math.max(0, ...d.closures.map(c => c.id)) + 1,
      officeId: Number(b.officeId) || d.currentUser.officeId,
      closingDate: b.closingDate || todayISO(),
      createdDate: todayISO(),
      comments: b.comments ?? 'Period closed.',
      status: 'closed' as const,
    }
    d.closures.push(closure)
    logAudit(d, 'Accounting Closure', 'CREATE', closure.id, `${closure.closingDate} — ${d.offices.find(o => o.id === closure.officeId)?.name}`)
    return { data: closure, message: `Books closed up to ${closure.closingDate}.` }
  }

  const p = pageQuery(event)
  const items = [...d.closures].sort((a, b) => (a.closingDate < b.closingDate ? 1 : -1))
    .map(c => ({ ...c, officeName: d.offices.find(o => o.id === c.officeId)?.name ?? '—' }))
  return paged(items, p)
})
