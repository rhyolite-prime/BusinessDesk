import { handleVoucherTransition } from '../../../../utils/ledger-voucher-actions'

export default defineEventHandler((event) => handleVoucherTransition(event, 'post'))
