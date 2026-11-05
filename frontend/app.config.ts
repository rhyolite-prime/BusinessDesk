/**
 * Default BusinessDesk tenant branding. Tenant deployments can override
 * these values without changing the shared UI layer.
 */
export default defineAppConfig({
  brand: {
    productName: 'BusinessDesk 720',
    institutionName: 'RhyolitePrime',
    institutionShort: 'RhyolitePrime',
    tagline: 'One workspace for finance and operations',
    theme: {
      primary: '#1B4B42',
      primaryDark: '#0C352D',
      primaryLight: '#E8F1ED',
      onPrimary: '#FFFFFF',
      sidebar: '#0C231C',
      accent: '#E8A33D',
    },
    currency: { code: 'GHS', symbol: 'GH₵', locale: 'en-GH' },
    contact: { email: '', phone: '' },
    footerNote: '',
  },
})
