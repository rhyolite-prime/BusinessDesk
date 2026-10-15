/** Audit trail — every mutation across every module is logged here. */
export default defineEventHandler((event) => {
  const d = db()
  const p = pageQuery(event)
  let items = [...d.audit].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
  if (p.q) items = items.filter(a =>
    a.entityName.toLowerCase().includes(p.q) || a.userName.toLowerCase().includes(p.q) || a.action.toLowerCase().includes(p.q))
  if (p.raw.entity) items = items.filter(a => a.entity.toLowerCase() === String(p.raw.entity).toLowerCase())
  if (p.raw.result) items = items.filter(a => a.result === p.raw.result)
  const decorated = items.map(a => ({
    ...a,
    officeName: d.offices.find(o => o.id === a.officeId)?.name ?? '—',
  }))
  return paged(decorated, p)
})
