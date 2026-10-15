export default defineNuxtRouteMiddleware(async (to) => {
  const { user, sessionChecked, refreshSession } = useBusinessDeskAuth()
  const isProtectedRoute = to.path === '/modules' || to.path.startsWith('/modules/') || to.path === '/ledger' || to.path.startsWith('/ledger/')
  const isLoginRoute = to.path === '/login'

  if ((isProtectedRoute || isLoginRoute) && !sessionChecked.value) {
    await refreshSession()
  }

  if (isProtectedRoute && !user.value) {
    return navigateTo('/login', { replace: true })
  }

  if (isLoginRoute && user.value) {
    return navigateTo('/modules', { replace: true })
  }
})
