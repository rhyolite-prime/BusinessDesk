import type { BankAccount } from './bank-account-types'
import type { SupplierRecord } from './supplier-fields'
export interface VoucherAccount {
  id: string
  accountNumber: string
  accountName: string
  status: string
  currencyId: string | null
  accountType: number
}
interface Unit {
  id: string
  name: string
  code: string
  isActive: boolean
  baseCurrencyId: string
}
interface Currency {
  id: string
  code: string
  name: string
  isActive: boolean
}
interface Center {
  id: string
  name: string
  parentId: string | null
}
export function useVoucherLookups() {
  const request = useRequestFetch(),
    { user } = useBusinessDeskAuth()
  const unitId = useState<string>('ledger-accounting-unit', () => ''),
    units = ref<Unit[]>([]),
    currencies = ref<Currency[]>([]),
    suppliers = ref<SupplierRecord[]>([]),
    centers = ref<Center[]>([]),
    accounts = ref<VoucherAccount[]>([]),
    banks = ref<BankAccount[]>([]),
    loading = ref(true),
    error = ref('')
  let generation = 0
  const identity = () => `${user.value?.accountId}:${user.value?.username}`
  async function pages<T>(path: string, query: Record<string, string> = {}) {
    const data: T[] = []
    for (let pageNo = 1; pageNo <= 100; pageNo++) {
      const r = await request<{ data: T[]; totalPages: number }>(path, {
        query: { ...query, pageNo, pageSize: 100 },
      })
      if (!Array.isArray(r.data) || !Number.isInteger(r.totalPages))
        throw new Error('Invalid catalog response')
      data.push(...r.data)
      if (!r.data.length || pageNo >= r.totalPages) return data
    }
    throw new Error(
      'Catalog exceeds supported size. Narrow your configuration before continuing.',
    )
  }
  async function load() {
    const current = ++generation,
      who = identity()
    loading.value = true
    error.value = ''
    accounts.value = []
    banks.value = []
    try {
      const [u, c, s, o] = await Promise.all([
        pages<Unit>('/api/ledger/accounting-units'),
        pages<Currency>('/api/shared/currencies'),
        pages<SupplierRecord>('/api/shared/suppliers'),
        request<{ data: Center[] }>('/api/shared/cost-centers'),
      ])
      if (current !== generation || who !== identity()) return
      units.value = u.filter((x) => x.isActive)
      currencies.value = c.filter((x) => x.isActive)
      suppliers.value = s.filter((x) => x.statusId !== 'inactive')
      centers.value = o.data
      if (!units.value.some((x) => x.id === unitId.value)) {
        unitId.value = units.value[0]?.id || ''
        if (unitId.value) return
      } // watch loads the selected scope
      if (!unitId.value)
        throw new Error('Create an active accounting unit first.')
      const scope = unitId.value
      const [a, b] = await Promise.all([
        pages<VoucherAccount>('/api/ledger/accounts', {
          accountingUnitId: scope,
        }),
        request<{ data: BankAccount[] }>('/api/ledger/bank-accounts', {
          query: { accountingUnitId: scope },
        }),
      ])
      if (
        current !== generation ||
        who !== identity() ||
        scope !== unitId.value
      )
        return
      accounts.value = a.filter((x) => x.status === 'active')
      banks.value = b.data.filter((x) => x.isActive)
    } catch (e: any) {
      if (current === generation && who === identity())
        error.value =
          e?.data?.statusMessage ||
          e?.message ||
          'Voucher configuration unavailable.'
    } finally {
      if (current === generation && who === identity()) loading.value = false
    }
  }
  const baseCurrency = computed(
    () =>
      currencies.value.find(
        (c) =>
          c.id ===
          units.value.find((u) => u.id === unitId.value)?.baseCurrencyId,
      )?.code || '',
  )
  const costCenters = computed(() =>
    centers.value.map((c) => {
      const path: string[] = [],
        seen = new Set<string>()
      let node: Center | undefined = c
      while (node && !seen.has(node.id)) {
        seen.add(node.id)
        path.unshift(node.name)
        node = centers.value.find((x) => x.id === node?.parentId)
      }
      return { ...c, path: path.join(' / ') }
    }),
  )
  watch(unitId, () => void load())
  onMounted(load)
  watch(identity, () => {
    generation++
    units.value = []
    currencies.value = []
    suppliers.value = []
    centers.value = []
    accounts.value = []
    banks.value = []
    unitId.value = ''
    if (user.value) void load()
  })
  onUnmounted(() => {
    generation++
  })
  return {
    unitId,
    units,
    currencies,
    suppliers,
    costCenters,
    accounts,
    banks,
    baseCurrency,
    loading,
    error,
    load,
  }
}
