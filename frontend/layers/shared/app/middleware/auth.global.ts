/** Resolve the real backend identity, never trust a browser-editable flag cookie. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/host' || to.path.startsWith('/host/')) {
    let authenticated = false
    try { authenticated = (await useRequestFetch()<{ authenticated: boolean }>('/api/host/me')).authenticated }
    catch (e: any) {
      const status = e?.response?.status || e?.statusCode
      if (status !== 401 && status !== 403) throw createError({ statusCode: 503, statusMessage: 'Host session verification unavailable.' })
    }
    if (to.path === '/host/login') { if (authenticated) return navigateTo('/host/currencies'); return }
    if (!authenticated) return navigateTo('/host/login')
    return
  }
  const auth = useBusinessDeskAuth()
  await auth.refreshSession()
  const isPublic = ['/login', '/signup'].some(path => to.path === path || to.path.startsWith(`${path}/`))
  if (isPublic) {
    if (auth.isAuthenticated.value) return navigateTo('/modules')
    return
  }
  if (!auth.isAuthenticated.value) return navigateTo('/login')
})
