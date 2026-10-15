/**
 * Default branding for the shared-resource layer.
 * The deploying tenant overrides these values in the root app.config.ts.
 */
export default defineAppConfig({
  brand: {
    productName: 'TL Core Banking',
    institutionName: 'TL Digital Bank',
    institutionShort: 'TL Bank',
    tagline: 'Core banking, delivered as a service',
    theme: {
      primary: '#1D4ED8',
      primaryDark: '#1E40AF',
      primaryLight: '#E8EEFC',
      onPrimary: '#FFFFFF',
      sidebar: '#0F1E3D',
      accent: '#F59E0B',
    },
    currency: { code: 'GHS', symbol: 'GH₵', locale: 'en-GH' },
    contact: { email: 'support@tlbank.example', phone: '+233 30 000 0000' },
    footerNote: '',
  },
})
