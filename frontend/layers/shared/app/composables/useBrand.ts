/**
 * White-label branding.
 *  - Defaults come from app.config.ts (one file per tenant).
 *  - Theme presets can be applied live (CSS custom properties on <html>)
 *    to demonstrate multi-tenant re-skinning; choice persists locally.
 */

export interface BrandTheme {
  primary: string
  primaryDark: string
  primaryLight: string
  onPrimary: string
  sidebar: string
  accent: string
}

export interface BrandPreset {
  key: string
  label: string
  institutionName: string
  institutionShort: string
  tagline: string
  theme: BrandTheme
}

export const BRAND_PRESETS: BrandPreset[] = [
  {
    key: 'sikatrust', label: 'SikaTrust Microfinance',
    institutionName: 'SikaTrust Microfinance', institutionShort: 'SikaTrust',
    tagline: 'Banking for every community',
    theme: { primary: '#0B6E4F', primaryDark: '#08543D', primaryLight: '#E6F4EF', onPrimary: '#FFFFFF', sidebar: '#0C231C', accent: '#E8A33D' },
  },
  {
    key: 'tldigital', label: 'TL Digital Bank',
    institutionName: 'TL Digital Bank', institutionShort: 'TL Bank',
    tagline: 'Core banking, delivered as a service',
    theme: { primary: '#1D4ED8', primaryDark: '#1E40AF', primaryLight: '#E8EEFC', onPrimary: '#FFFFFF', sidebar: '#0F1E3D', accent: '#F59E0B' },
  },
  {
    key: 'royal', label: 'Royal MFB',
    institutionName: 'Royal Microfinance Bank', institutionShort: 'Royal',
    tagline: 'Royal service for every customer',
    theme: { primary: '#7C3AED', primaryDark: '#6D28D9', primaryLight: '#F1EAFE', onPrimary: '#FFFFFF', sidebar: '#22123F', accent: '#FBBF24' },
  },
  {
    key: 'sunshine', label: 'Sunshine Savings & Loans',
    institutionName: 'Sunshine Savings & Loans', institutionShort: 'Sunshine',
    tagline: 'Your money, rising every day',
    theme: { primary: '#C2410C', primaryDark: '#9A3412', primaryLight: '#FDEEE5', onPrimary: '#FFFFFF', sidebar: '#2A1608', accent: '#0EA5E9' },
  },
]

export function useBrand() {
  const appConfig = useAppConfig()
  const brand = computed(() => appConfig.brand)
  const activePreset = ref<string>(appConfig.brand.institutionShort ?? 'default')

  const varsFor = (t: BrandTheme) => ({
    '--brand-primary': t.primary,
    '--brand-primary-dark': t.primaryDark,
    '--brand-primary-light': t.primaryLight,
    '--brand-on-primary': t.onPrimary,
    '--brand-sidebar': t.sidebar,
    '--brand-accent': t.accent,
  })

  /** SSR-safe: inject the configured theme as a <style> on first paint. */
  function headTheme() {
    const vars = varsFor(brand.value.theme)
    const css = ':root{' + Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';') + '}'
    useHead({ style: [{ innerHTML: css, id: 'brand-theme' }] })
  }

  function applyToDocument(t: BrandTheme) {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    for (const [k, v] of Object.entries(varsFor(t))) root.style.setProperty(k, v)
  }

  function applyPreset(preset: BrandPreset) {
    applyToDocument(preset.theme)
    appConfig.brand.institutionName = preset.institutionName
    appConfig.brand.institutionShort = preset.institutionShort
    appConfig.brand.tagline = preset.tagline
    appConfig.brand.theme = preset.theme
    activePreset.value = preset.key
    if (typeof localStorage !== 'undefined') localStorage.setItem('tl-brand-preset', preset.key)
  }

  /** Restore a tenant-chosen theme after hydration. */
  function init() {
    headTheme()
    onMounted(() => {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('tl-brand-preset') : null
      const preset = BRAND_PRESETS.find(p => p.key === saved)
      if (preset) applyPreset(preset)
      else applyToDocument(brand.value.theme)
    })
  }

  return { brand, activePreset, presets: BRAND_PRESETS, init, applyPreset }
}
