import { defineEventHandler, setResponseHeader } from 'h3'
import { resolveBusinessDeskSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const session = await resolveBusinessDeskSession(event)
  return { user: session?.user ?? null, demo: session?.demo ?? false }
})
