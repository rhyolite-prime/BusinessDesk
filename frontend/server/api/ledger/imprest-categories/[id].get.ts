import { imprestCategoryRequest } from '../../../utils/imprest-category-api'
export default defineEventHandler((event) =>
  imprestCategoryRequest(event, 'GET', true),
)
