/** Resolve the real backend identity, never trust a browser-editable flag cookie. */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useBusinessDeskAuth()
  await auth.refreshSession()
  const isPublic = ['/login', '/signup'].some(path => to.path === path || to.path.startsWith(`${path}/`))
  if (isPublic) {
    if (auth.isAuthenticated.value) return navigateTo('/modules')
    return
  }
  if (!auth.isAuthenticated.value) return navigateTo('/login')
})
