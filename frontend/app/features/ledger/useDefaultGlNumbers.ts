import type { LedgerDefaultGlNumbers } from './setup-data'
/** Read-only bridge for legacy ledger screens. Never fall back to demo defaults. */
export function useDefaultGlNumbers() {
  const request = useRequestFetch(), unit = useState<string>('ledger-accounting-unit', () => '')
  const defaultGlNumbers = ref<LedgerDefaultGlNumbers | null>(null)
  let version = 0
  async function load() {
    const current = ++version, selected = unit.value
    defaultGlNumbers.value = null
    if (!selected) return
    try {
      const r = await request<{ data: LedgerDefaultGlNumbers[] }>('/api/ledger/default-gl-numbers', { query: { accountingUnitId: selected } })
      if (current === version) defaultGlNumbers.value = r.data[0] || null
    } catch { /* Legacy callers treat unavailable defaults as unconfigured. */ }
  }
  onMounted(load)
  watch(unit, load)
  onUnmounted(() => { version++ })
  return { defaultGlNumbers: readonly(defaultGlNumbers) }
}
