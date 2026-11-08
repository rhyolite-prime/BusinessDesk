import type {
  CreateLedgerVoucherInput,
  LedgerVoucher,
  LedgerVouchersResponse,
} from './voucher-data'

export function useLedgerVoucherApi() {
  const requestFetch = useRequestFetch()
  const getRequest = <T,>(path: string, query?: Record<string, string>) =>
    requestFetch<T>(
      `/api/ledger/vouchers${path}`,
      query ? { query } : undefined,
    )

  return {
    list: (query: Record<string, string> = {}) =>
      getRequest<LedgerVouchersResponse>('', query),
    get: (id: string) =>
      getRequest<LedgerVoucher>(`/${encodeURIComponent(id)}`),
    create: (input: CreateLedgerVoucherInput) =>
      $fetch<LedgerVoucher>('/api/ledger/vouchers', {
        method: 'POST',
        body: input,
      }),
    update: (id: string, input: CreateLedgerVoucherInput) =>
      $fetch<LedgerVoucher>(`/api/ledger/vouchers/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: input,
      }),
    remove: (id: string, version: number) =>
      $fetch<{ id: string; deleted: true }>(
        `/api/ledger/vouchers/${encodeURIComponent(id)}`,
        { method: 'DELETE', query: { version } },
      ),
    submit: (id: string, version: number) =>
      $fetch<LedgerVoucher>(
        `/api/ledger/vouchers/${encodeURIComponent(id)}/submit`,
        { method: 'POST', body: { version } },
      ),
    approve: (id: string, version: number) =>
      $fetch<LedgerVoucher>(
        `/api/ledger/vouchers/${encodeURIComponent(id)}/approve`,
        { method: 'POST', body: { version } },
      ),
    post: (id: string, version: number) =>
      $fetch<LedgerVoucher>(
        `/api/ledger/vouchers/${encodeURIComponent(id)}/post`,
        { method: 'POST', body: { version } },
      ),
  }
}
