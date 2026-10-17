/**
 * White-label branding shared by the BusinessDesk shell and feature modules.
 * Tenant deployments may override the defaults in the root app.config.ts.
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

const defaultName = 'BusinessDesk'
const defaultTagline = 'One workspace for finance and operations'

export const BRAND_PRESETS: BrandPreset[] = [
  {
    key: 'businessdesk-forest', label: 'BusinessDesk · Forest',
    institutionName: defaultName, institutionShort: defaultName,
    tagline: defaultTagline,
    theme: { primary: '#1B4B42', primaryDark: '#0C352D', primaryLight: '#E8F1ED', onPrimary: '#FFFFFF', sidebar: '#0C231C', accent: '#E8A33D' },
  },
  {
    key: 'businessdesk-ocean', label: 'BusinessDesk · Ocean',
    institutionName: defaultName, institutionShort: defaultName,
    tagline: defaultTagline,
    theme: { primary: '#1D4ED8', primaryDark: '#1E40AF', primaryLight: '#E8EEFC', onPrimary: '#FFFFFF', sidebar: '#0F1E3D', accent: '#F59E0B' },
  },
  {
    key: 'businessdesk-violet', label: 'BusinessDesk · Violet',
    institutionName: defaultName, institutionShort: defaultName,
    tagline: defaultTagline,
    theme: { primary: '#7C3AED', primaryDark: '#6D28D9', primaryLight: '#F1EAFE', onPrimary: '#FFFFFF', sidebar: '#22123F', accent: '#FBBF24' },
  },
  {
    key: 'businessdesk-copper', label: 'BusinessDesk · Copper',
    institutionName: defaultName, institutionShort: defaultName,
    tagline: defaultTagline,
    theme: { primary: '#C2410C', primaryDark: '#9A3412', primaryLight: '#FDEEE5', onPrimary: '#FFFFFF', sidebar: '#2A1608', accent: '#0EA5E9' },
  },
]

export function useBrand() {
  const appConfig = useAppConfig()
  const brand = computed(() => appConfig.brand)
  const activePreset = ref<string>(appConfig.brand.institutionShort ?? 'default')

  const varsFor = (theme: BrandTheme) => ({
    '--brand-primary': theme.primary,
    '--brand-primary-dark': theme.primaryDark,
    '--brand-primary-light': theme.primaryLight,
    '--brand-on-primary': theme.onPrimary,
    '--brand-sidebar': theme.sidebar,
    '--brand-accent': theme.accent,
  })

  function headTheme() {
    const variables = varsFor(brand.value.theme)
    const css = ':root{' + Object.entries(variables).map(([key, value]) => `${key}:${value}`).join(';') + '}'
    useHead({ style: [{ innerHTML: css, id: 'brand-theme' }] })
  }

  function applyToDocument(theme: BrandTheme) {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    for (const [key, value] of Object.entries(varsFor(theme))) root.style.setProperty(key, value)
  }

  function applyPreset(preset: BrandPreset) {
    applyToDocument(preset.theme)
    appConfig.brand.institutionName = preset.institutionName
    appConfig.brand.institutionShort = preset.institutionShort
    appConfig.brand.tagline = preset.tagline
    appConfig.brand.theme = preset.theme
    activePreset.value = preset.key
    if (typeof localStorage !== 'undefined') localStorage.setItem('businessdesk-brand-preset', preset.key)
  }

  function init() {
    headTheme()
    onMounted(() => {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('businessdesk-brand-preset') : null
      const preset = BRAND_PRESETS.find((candidate) => candidate.key === saved)
      if (preset) applyPreset(preset)
      else applyToDocument(brand.value.theme)
    })
  }

  return { brand, activePreset, presets: BRAND_PRESETS, init, applyPreset }
}
