import { defineEventHandler, setResponseHeader } from 'h3'
import { getAuthSettings } from '../../utils/auth'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const { serviceBaseUrl, demoEnabled } = getAuthSettings(event)
  return { serviceConfigured: Boolean(serviceBaseUrl), demoMode: demoEnabled }
})
