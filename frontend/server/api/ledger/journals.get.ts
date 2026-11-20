import { getQuery } from 'h3'
import { journalRequest } from '../../utils/journal-api'

export default defineEventHandler(async (event) => {
  const result = await journalRequest(event, 'GET', 'list')
  const query = getQuery(event)
  const from =
    typeof query.dateFrom === 'string'
      ? query.dateFrom
      : typeof query.startDate === 'string'
        ? query.startDate
        : typeof query.from === 'string'
          ? query.from
          : ''
  const to =
    typeof query.dateTo === 'string'
      ? query.dateTo
      : typeof query.endDate === 'string'
        ? query.endDate
        : typeof query.to === 'string'
          ? query.to
          : ''
  const status = typeof query.status === 'string' ? query.status : ''
  const search = typeof query.search === 'string' ? query.search.trim().toLowerCase() : ''
  const pageNo = query.pageNo ? Math.max(1, Number(query.pageNo)) : 1
  const pageSize = query.pageSize ? Math.max(1, Math.min(200, Number(query.pageSize))) : 20

  if (result) {
    if (result.totalPages !== undefined && result.pageNo !== undefined) {
      return result
    }
    if (Array.isArray(result.items)) {
      let filtered = result.items
      if (from || to || status || search) {
        filtered = result.items.filter((r: any) => {
          if (status && r.status !== status) return false
          if (from && r.batchDate < from) return false
          if (to && r.batchDate > to) return false
          if (search) {
            const batch = String(r.batchNumber || '').toLowerCase()
            const desc = String(r.description || '').toLowerCase()
            const headerMatch =
              batch.includes(search) ||
              desc.includes(search) ||
              search.split(/\s+/).filter(Boolean).every((t) => `${batch} ${desc}`.includes(t))

            const lineMatch =
              Array.isArray(r.lines) &&
              r.lines.some((l: any) => {
                const ref = String(l.referenceNumber || '').toLowerCase()
                const lDesc = String(l.description || '').toLowerCase()
                const chq = String(l.chequeNumber || '').toLowerCase()
                const accNum = String(l.accountNumber || '').toLowerCase()
                const accName = String(l.accountName || '').toLowerCase()
                const cc = String(l.organizationUnitName || l.costCenterName || l.costCenterId || '').toLowerCase()
                if (
                  ref.includes(search) ||
                  lDesc.includes(search) ||
                  chq.includes(search) ||
                  accNum.includes(search) ||
                  accName.includes(search) ||
                  cc.includes(search)
                ) {
                  return true
                }
                const tokens = search.split(/\s+/).filter(Boolean)
                if (tokens.length > 1) {
                  const combined = `${ref} ${lDesc} ${chq} ${accNum} ${accName} ${cc}`
                  return tokens.every((t) => combined.includes(t))
                }
                return false
              })

            if (!headerMatch && !lineMatch) return false
          }
          return true
        })
      }
      const total = filtered.length
      const totalPages = Math.max(1, Math.ceil(total / pageSize))
      const paginatedItems = filtered.slice((pageNo - 1) * pageSize, pageNo * pageSize)
      return {
        ...result,
        items: paginatedItems,
        total,
        pageNo,
        pageSize,
        totalPages,
      }
    }
  }
  return result
})
