/** Shared Nitro helpers for every module's stubbed API endpoints. */
import type { Paged } from '@shared/types/models'

export interface PageQuery {
  page: number
  size: number
  q: string
  raw: Record<string, any>
}

export function pageQuery(event: any): PageQuery {
  const q = getQuery(event) as Record<string, any>
  return {
    page: Math.max(1, Number(q.page) || 1),
    size: Math.min(200, Number(q.size) || 20),
    q: String(q.q ?? '').trim().toLowerCase(),
    raw: q,
  }
}

export function paged<T>(items: T[], p: PageQuery): Paged<T> {
  const start = (p.page - 1) * p.size
  return {
    pageItems: items.slice(start, start + p.size),
    totalFilteredCount: items.length,
    page: p.page,
    size: p.size,
  }
}

export function requireMethod(event: any, ...methods: string[]) {
  if (!methods.includes(event.method)) {
    throw createError({ statusCode: 405, statusMessage: `Method ${event.method} not allowed; expected ${methods.join('/')}` })
  }
}

export function bodyOf(event: any) {
  return readBody(event) as Promise<Record<string, any>>
}

export function notFound(msg = 'Resource not found') {
  return createError({ statusCode: 404, statusMessage: msg, message: msg })
}

export function badRequest(msg: string) {
  return createError({ statusCode: 400, statusMessage: msg, message: msg })
}

/** GL balance for a tag: DEBIT-normal accounts → debits − credits, else inverted. */
export function glBalance(d: Awaited<ReturnType<typeof import('./db').db>>, glAccountId: number): number {
  const acct = d.glAccounts.find(a => a.id === glAccountId)
  if (!acct) return 0
  const debitNormal = acct.type === 'ASSET' || acct.type === 'EXPENSE'
  let bal = 0
  for (const j of d.journals) {
    if (j.glAccountId !== glAccountId || j.reversed) continue
    bal += j.entryType === 'DEBIT' ? j.amount : -j.amount
  }
  return Math.round((debitNormal ? bal : -bal) * 100) / 100
}
