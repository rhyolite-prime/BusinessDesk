import type { BankAccount } from './bank-account-types'
import type { LedgerBankAccount } from './setup-data'
/** Real read-only adapter for legacy ledger screens, never demo-bank fallback. */
export function useBankAccounts() {
 const request = useRequestFetch(), unit = useState<string>('ledger-accounting-unit', () => '')
 const bankAccounts = ref<LedgerBankAccount[]>([])
 let version = 0
 async function load() {
  const current = ++version, selected = unit.value
  bankAccounts.value = []
  if (!selected) return
  try {
   const r = await request<{data: BankAccount[]}>('/api/ledger/bank-accounts', {query:{accountingUnitId:selected}})
   if (current === version) bankAccounts.value = r.data.map(a => ({...a,dateOpened:a.dateOpened || '',currency:a.currencyCode || ''}))
  } catch { /* Unavailable bank accounts stay empty, never fabricated. */ }
 }
 onMounted(load); watch(unit, load); onUnmounted(() => { version++ })
 return {bankAccounts:readonly(bankAccounts)}
}
