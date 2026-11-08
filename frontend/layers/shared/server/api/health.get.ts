/** Liveness / readiness probe — also confirms the mock DB engine boots. */
export default defineEventHandler((event) => {
  const d = db()
  return {
    status: 'UP',
    service: 'tl-core-banking-api (mock)',
    timestamp: new Date().toISOString(),
    counts: {
      clients: d.clients.length,
      loans: d.loans.length,
      savings: d.savings.length,
      journalEntries: d.journals.length,
      pendingTasks: d.tasks.filter(t => t.status === 'pending').length,
    },
  }
})
