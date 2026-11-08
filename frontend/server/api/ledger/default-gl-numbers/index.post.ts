import { defaultGlRequest } from '../../../utils/default-gl-api'
export default defineEventHandler(event => defaultGlRequest(event, 'POST', 'list'))
