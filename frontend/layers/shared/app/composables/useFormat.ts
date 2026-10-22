/** Locale-aware financial formatting driven by the tenant brand config. */

export function useFormat() {
  const { brand } = useBrand()
  const preferences = useState<{
    locale: string
    timeZone: string
    dateStyle: 'short' | 'medium' | 'long'
    timeFormat: string
    moneyDecimals: number
    useGrouping: boolean
  } | null>('tenant-preferences-settings', () => null)

  const money = (n: number | null | undefined, abs = false) => {
    const v = n ?? 0
    const cur = brand.value.currency
    try {
      return new Intl.NumberFormat(preferences.value?.locale || cur.locale, {
        style: 'currency',
        currency: cur.code,
        minimumFractionDigits: preferences.value?.moneyDecimals ?? 2,
        maximumFractionDigits: preferences.value?.moneyDecimals ?? 2,
        useGrouping: preferences.value?.useGrouping ?? true,
      }).format(abs ? Math.abs(v) : v)
    } catch {
      return `${cur.symbol} ${(abs ? Math.abs(v) : v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    }
  }

  const num = (n: number | null | undefined, digits = 0) =>
    (n ?? 0).toLocaleString(preferences.value?.locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      useGrouping: preferences.value?.useGrouping ?? true,
    })

  const pct = (n: number | null | undefined, digits = 1) =>
    new Intl.NumberFormat(
      preferences.value?.locale || brand.value.currency.locale,
      {
        style: 'percent',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
        useGrouping: preferences.value?.useGrouping ?? true,
      },
    ).format(n ?? 0)

  const date = (iso: string | null | undefined) => {
    if (!iso) return '—'
    try {
      return new Intl.DateTimeFormat(preferences.value?.locale || 'en-GB', {
        dateStyle: preferences.value?.dateStyle || 'medium',
        timeZone:
          iso.length === 10 ? 'UTC' : preferences.value?.timeZone || 'UTC',
      }).format(new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso))
    } catch {
      return iso
    }
  }

  const dateTime = (iso: string | null | undefined) => {
    if (!iso) return '—'
    try {
      return new Intl.DateTimeFormat(preferences.value?.locale || 'en-GB', {
        dateStyle: preferences.value?.dateStyle || 'medium',
        timeStyle: 'short',
        timeZone: preferences.value?.timeZone || 'UTC',
        hour12: preferences.value?.timeFormat === '12h',
      }).format(new Date(iso))
    } catch {
      return iso
    }
  }

  const relative = (iso: string | null | undefined) => {
    if (!iso) return '—'
    const days = Math.round(
      (Date.now() -
        new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso).getTime()) /
        86400000,
    )
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days > 0) return `${days}d ago`
    return `in ${-days}d`
  }

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?'

  return { money, num, pct, date, dateTime, relative, initials }
}
