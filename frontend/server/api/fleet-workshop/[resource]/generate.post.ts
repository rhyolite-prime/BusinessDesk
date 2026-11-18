import { fleetWorkshopRequest } from '../../../utils/fleet-workshop-api'

export default defineEventHandler(event => fleetWorkshopRequest(event, 'POST', 'schedules-generate'))
