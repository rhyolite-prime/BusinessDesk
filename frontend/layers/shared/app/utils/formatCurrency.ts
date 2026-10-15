export function formatCurrency(
  value: number | string,
  currency = 'GHS',
  options: Intl.NumberFormatOptions = {},
) {
  const formatter = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  })

  if (typeof value === 'string') {
    const amount = value.trim()
    if (!/^-?\d+(\.\d+)?$/.test(amount)) return '—'
    // Preserve exact decimal-string precision for high-value ledger balances.
    const formatExact = formatter.format as unknown as (decimal: string) => string
    return formatExact(amount)
  }

  if (!Number.isFinite(value)) return '—'
  return formatter.format(value)
}

export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date)
}

export function formatCompact(value: number | string) {
  const amount = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat('en-GH', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}
