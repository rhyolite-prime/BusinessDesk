export interface ImprestCategory {
  id: string
  name: string
  accountingUnitId: string
  version: number
}
export function useImprestCategories() {
  const request = useRequestFetch(),
    unit = useState<string>('ledger-accounting-unit', () => '')
  const { user } = useBusinessDeskAuth()
  const categories = ref<ImprestCategory[]>([]),
    loading = ref(false),
    error = ref('')
  let generation = 0
  const identity = () =>
    `${user.value?.accountId}/${user.value?.username}/${unit.value}`
  async function load() {
    const current = ++generation,
      who = identity(),
      selected = unit.value
    categories.value = []
    error.value = ''
    if (!selected) {
      loading.value = false
      return
    }
    loading.value = true
    try {
      const r = await request<{ data: ImprestCategory[] }>(
        '/api/ledger/imprest-categories',
        { query: { accountingUnitId: selected } },
      )
      if (current === generation && who === identity())
        categories.value = r.data
    } catch (e: any) {
      if (current === generation && who === identity())
        error.value =
          e?.data?.statusMessage || 'Unable to load imprest categories.'
    } finally {
      if (current === generation) loading.value = false
    }
  }
  onMounted(load)
  watch(identity, load)
  onUnmounted(() => {
    generation++
  })
  return { categories, loading, error, load, unit }
}
