// No mock password mutation or fallback to a seeded current user.
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  throw createError({ statusCode: 501, statusMessage: 'Use authorized tenant user management to reset your password.' })
})
