// Retired demo provisioning must not claim to create a real tenant/user.
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  throw createError({ statusCode: 501, statusMessage: 'Contact your platform administrator to provision a tenant account.' })
})
