/**
 * White-label branding configuration.
 * An institution deploying TL Core Banking edits ONLY this file to
 * re-brand the entire platform (name, logo wordmark, colour theme,
 * currency, support contact). The shared-resource layer reads these
 * values at runtime and applies them as CSS custom properties — no
 * component changes required.
 */
export default defineAppConfig({
  brand: {
    productName: 'TL Core Banking',
    institutionName: 'SikaTrust Microfinance',
    institutionShort: 'SikaTrust',
    tagline: 'Banking for every community',
    // Theme palette (driven through CSS variables → Tailwind theme tokens)
    theme: {
      primary: '#0B6E4F',       // brand green
      primaryDark: '#08543D',
      primaryLight: '#E6F4EF',
      onPrimary: '#FFFFFF',
      sidebar: '#0C231C',       // deep evergreen sidebar
      accent: '#E8A33D',        // gold accent
    },
    currency: { code: 'GHS', symbol: 'GH₵', locale: 'en-GH' },
    contact: { email: 'support@sikatrust.example', phone: '+233 30 255 0100' },
    footerNote: 'Licensed under the Companies Act, 2019 (Act 992). Deposits insured by GHIDIC.',
  },
})
