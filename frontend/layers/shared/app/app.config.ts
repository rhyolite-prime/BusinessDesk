/**
 * Default BusinessDesk branding; tenant deployments can override this in the
 * root app.config.ts without editing shared components.
 */
export default defineAppConfig({
  brand: {
    productName: 'BusinessDesk 720 ERP',
    institutionName: 'BusinessDesk 720',
    institutionShort: 'Rhyolite',
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
