// Never allow fetching an existing user's secret by supplying a username.
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  throw createError({ statusCode: 410, statusMessage: 'Start a new tenant sign-in to enroll an authenticator.' })
})
