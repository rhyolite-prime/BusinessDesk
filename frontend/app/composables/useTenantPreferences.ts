export interface TenantPreferences {
  locale: string
  timeZone: string
  dateStyle: 'short' | 'medium' | 'long'
  timeFormat: '12h' | '24h'
  moneyDecimals: number
  useGrouping: boolean
  paperSize: 'A4' | 'Letter'
  orientation: 'portrait' | 'landscape'
}
export const defaultTenantPreferences = (): TenantPreferences => ({
  locale: 'en-GH',
  timeZone: 'Africa/Accra',
  dateStyle: 'medium',
  timeFormat: '24h',
  moneyDecimals: 2,
  useGrouping: true,
  paperSize: 'A4',
  orientation: 'portrait',
})
export function useTenantPreferences() {
  const settings = useState<TenantPreferences | null>(
    'tenant-preferences-settings',
    () => null,
  )
  const version = useState<number>('tenant-preferences-version', () => -1)
  return { settings, version }
}
