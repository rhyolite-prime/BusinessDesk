import { preferencesRequest } from '../utils/preferences-api'
export default defineEventHandler((event) => preferencesRequest(event, 'save'))
