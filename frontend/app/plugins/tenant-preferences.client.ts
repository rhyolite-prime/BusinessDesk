import type { TenantPreferences } from '../composables/useTenantPreferences'
export default defineNuxtPlugin(() => {
  const { user } = useBusinessDeskAuth(),
    { settings, version } = useTenantPreferences()
  let request = 0
  watch(
    () => (user.value ? `${user.value.accountId}:${user.value.username}` : ''),
    async (identity) => {
      const current = ++request
      settings.value = null
      version.value = -1
      if (!identity) return
      try {
        const response = await $fetch<{
          settings: TenantPreferences
          version: number
        }>('/api/preferences')
        if (current === request && response.version >= version.value) {
          settings.value = response.settings
          version.value = response.version
        }
      } catch {
        /* Keep existing application formatting defaults when settings are unavailable. */
      }
    },
    { immediate: true },
  )
  useHead(() => ({
    style: [
      {
        key: 'tenant-print-preferences',
        innerHTML: `@media print { @page { size: ${settings.value?.paperSize === 'Letter' ? 'Letter' : 'A4'} ${settings.value?.orientation === 'landscape' ? 'landscape' : 'portrait'}; } }`,
      },
    ],
  }))
})
