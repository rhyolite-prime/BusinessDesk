/** Shared Chart of Accounts date/time style for the immutable report footer. */
export function formatReportTimestamp(value: Date | string, timeZone = 'UTC'): string {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Date/time unavailable'
  const options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short', timeZone: timeZone || 'UTC' }
  try {
    return new Intl.DateTimeFormat('en-GB', options).format(date)
  } catch {
    // Legacy units may contain an invalid zone. Never break the whole report.
    return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(date)
  }
}
