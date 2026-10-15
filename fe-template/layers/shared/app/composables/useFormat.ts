/** Locale-aware financial formatting driven by the tenant brand config. */

export function useFormat() {
  const { brand } = useBrand()

  const money = (n: number | null | undefined, abs = false) => {
    const v = n ?? 0
    const cur = brand.value.currency
    try {
      return new Intl.NumberFormat(cur.locale, {
        style: 'currency', currency: cur.code,
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      }).format(abs ? Math.abs(v) : v)
    } catch {
      return `${cur.symbol} ${(abs ? Math.abs(v) : v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    }
  }

  const num = (n: number | null | undefined, digits = 0) =>
    (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })

  const pct = (n: number | null | undefined, digits = 1) =>
    `${((n ?? 0) * 100).toFixed(digits)}%`

  const date = (iso: string | null | undefined) => {
    if (!iso) return '—'
    try {
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        .format(new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso))
    } catch { return iso }
  }

  const dateTime = (iso: string | null | undefined) => {
    if (!iso) return '—'
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(new Date(iso))
    } catch { return iso }
  }

  const relative = (iso: string | null | undefined) => {
    if (!iso) return '—'
    const days = Math.round((Date.now() - new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso).getTime()) / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days > 0) return `${days}d ago`
    return `in ${-days}d`
  }

  const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'

  return { money, num, pct, date, dateTime, relative, initials }
}
