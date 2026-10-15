import { getCookie as h3GetCookie } from 'h3'

/**
 * Global authentication guard.
 *  - Server-side: checks the real httpOnly session cookie via the request event.
 *  - Client-side: reads the non-sensitive `tl_authed` flag cookie (the real
 *    token is httpOnly and not visible to JS).
 * Unauthenticated visitors on app pages are redirected to /login; signing in
 * sets both cookies and the guard lets them through to their redirect target.
 */
export default defineNuxtRouteMiddleware((to) => {
  const PUBLIC = ['/login', '/signup']
  const isPublic = PUBLIC.some(p => to.path === p || to.path.startsWith(p + '/'))

  const isAuthed = () => {
    if (import.meta.server) {
      const event = useRequestEvent()
      return event ? !!h3GetCookie(event, 'tl_session') : false
    }
    return document.cookie.split('; ').some(c => c.startsWith('tl_authed='))
  }

  if (isPublic) {
    if (isAuthed()) return navigateTo('/')
    return
  }

  if (!isAuthed()) return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
})
