/**
 * API client.
 * Every frontend call goes through the Nuxt (Nitro) server at /api/* —
 * the server layer holds the Fineract base URL / tenant credentials and
 * currently serves stubbed mock data. Swap the server handlers for
 * proxied calls to Apache Fineract without touching any page.
 */
export function useApi() {
  function handle401() {
    if (import.meta.client) {
      document.cookie = 'tl_authed=; Max-Age=0; path=/'
      if (!location.pathname.startsWith('/login') && !location.pathname.startsWith('/signup')) {
        window.location.assign(`/login?redirect=${encodeURIComponent(location.pathname)}`)
      }
    }
  }

  async function request<T = any>(path: string, opts: any = {}): Promise<T> {
    try {
      return await $fetch<T>(`/api${path}`, opts)
    } catch (e: any) {
      if (e?.statusCode === 401 || e?.response?.status === 401) { handle401(); throw new Error('Your session has expired. Please sign in again.') }
      const msg = e?.data?.statusMessage || e?.data?.message || e?.statusMessage || 'Request failed. Please try again.'
      throw new Error(msg)
    }
  }

  return {
    get: <T = any>(path: string, params?: Record<string, any>) =>
      request<T>(path, { query: params }),
    post: <T = any>(path: string, body?: Record<string, any>) =>
      request<T>(path, { method: 'POST', body }),
  }
}

/**
 * Reactive server resource for list/detail pages.
 * Auto-refetches when the reactive query changes (filters, paging).
 */
export function useResource<T = any>(path: string, queryGetter?: () => Record<string, any>) {
  const q = computed(() => (queryGetter ? queryGetter() : {}))
  return useAsyncData<T>(
    `res-${path}`,
    () => $fetch<T>(`/api${path}`, { query: q.value }),
    { watch: [q] },
  )
}
