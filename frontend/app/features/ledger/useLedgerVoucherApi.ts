import type { CreateLedgerVoucherInput, LedgerVoucher, LedgerVouchersResponse } from './voucher-data'

export function useLedgerVoucherApi() {
  const requestFetch = useRequestFetch()
  const getRequest = <T>(path: string, query?: Record<string, string>) =>
    requestFetch<T>(`/api/ledger/vouchers${path}`, query ? { query } : undefined)

  return {
    list: (query: Record<string, string> = {}) => getRequest<LedgerVouchersResponse>('', query),
    get: (id: string) => getRequest<LedgerVoucher>(`/${encodeURIComponent(id)}`),
    create: (input: CreateLedgerVoucherInput) =>
      $fetch<LedgerVoucher>('/api/ledger/vouchers', { method: 'POST', body: input }),
    update: (id: string, input: CreateLedgerVoucherInput) =>
      $fetch<LedgerVoucher>(`/api/ledger/vouchers/${encodeURIComponent(id)}`, { method: 'PUT', body: input }),
    remove: (id: string) =>
      $fetch<{ id: string; deleted: true }>(`/api/ledger/vouchers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    submit: (id: string) =>
      $fetch<LedgerVoucher>(`/api/ledger/vouchers/${encodeURIComponent(id)}/submit`, { method: 'POST' }),
    approve: (id: string) =>
      $fetch<LedgerVoucher>(`/api/ledger/vouchers/${encodeURIComponent(id)}/approve`, { method: 'POST' }),
    post: (id: string) =>
      $fetch<LedgerVoucher>(`/api/ledger/vouchers/${encodeURIComponent(id)}/post`, { method: 'POST' }),
  }
}
