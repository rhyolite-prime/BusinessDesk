/** Maker-checker queue (Fineract "Maker Checker" / two-person rule). */
export default defineEventHandler((event) => {
  const d = db()
  const p = pageQuery(event)
  const status = String(p.raw.status ?? '')
  const entityType = String(p.raw.entityType ?? '')

  let items = [...d.tasks].sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1))
  if (status) items = items.filter(t => t.status === status)
  if (entityType) items = items.filter(t => t.entityType === entityType)

  return paged(items, p)
})
