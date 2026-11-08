import { supplierVoucherRequest } from '../../../../utils/supplier-voucher-api'
export default defineEventHandler(event => supplierVoucherRequest(event, 'POST', 'submit'))
