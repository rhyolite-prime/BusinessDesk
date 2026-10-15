/**
 * Global cross-module search (top-bar command search).
 * Searches clients, loan accounts, savings accounts, groups and staff —
 * the results deep-link into each module, demonstrating how the modules
 * interlink.
 */
export default defineEventHandler((event) => {
  const q = String(getQuery(event).q ?? '').trim().toLowerCase()
  if (q.length < 2) return { clients: [], loans: [], savings: [], groups: [], staff: [] }
  const d = db()
  const clientName = (id: number) => d.clients.find(c => c.id === id)?.displayName ?? ''
  const officeName = (id: number) => d.offices.find(o => o.id === id)?.name ?? ''

  const clients = d.clients
    .filter(c => c.displayName.toLowerCase().includes(q) || c.accountNo.toLowerCase().includes(q) || c.mobile.includes(q))
    .slice(0, 6)
    .map(c => ({ id: c.id, label: c.displayName, sub: `${c.accountNo} · ${officeName(c.officeId)}`, status: c.status, to: `/clients/${c.id}` }))

  const loans = d.loans
    .filter(l => l.accountNo.toLowerCase().includes(q) || clientName(l.clientId).toLowerCase().includes(q))
    .slice(0, 6)
    .map(l => ({ id: l.id, label: l.accountNo, sub: `${clientName(l.clientId)} · ${l.status}`, status: l.status, to: `/loans/${l.id}` }))

  const savings = d.savings
    .filter(s => s.accountNo.toLowerCase().includes(q) || clientName(s.clientId).toLowerCase().includes(q))
    .slice(0, 6)
    .map(s => ({ id: s.id, label: s.accountNo, sub: `${clientName(s.clientId)} · ${s.status}`, status: s.status, to: `/savings/${s.id}` }))

  const groups = d.groups
    .filter(g => g.name.toLowerCase().includes(q) || g.accountNo.toLowerCase().includes(q))
    .slice(0, 4)
    .map(g => ({ id: g.id, label: g.name, sub: `${g.accountNo} · ${g.memberIds.length} members`, status: g.status, to: `/groups/${g.id}` }))

  const staff = d.staff
    .filter(s => s.displayName.toLowerCase().includes(q))
    .slice(0, 4)
    .map(s => ({ id: s.id, label: s.displayName, sub: `${s.position} · ${officeName(s.officeId)}`, status: s.status, to: `/organization/staff` }))

  return { clients, loans, savings, groups, staff }
})
