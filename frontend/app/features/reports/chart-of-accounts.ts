import type { AccountDetail } from '../ledger/account-detail-types'
import type { LedgerAccountControl } from '../ledger/setup-data'
import type { EmbeddedReport } from './report-types'

interface Currency { id: string; code: string; name: string }
/** Join by IDs; never by account-number ranges, which may overlap. */
export function chartOfAccountsReport(input: {
  accounts: AccountDetail[]; controls: LedgerAccountControl[]; currencies: Currency[]
  companyName: string; unitName: string; baseCurrencyId: string; generatedAt: string
  status?: string; type?: string; query?: string
}): EmbeddedReport {
  const types = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']
  const controls = new Map(input.controls.map(control => [control.id, control]))
  const currencies = new Map(input.currencies.map(currency => [currency.id, currency.name || currency.code]))
  const query = input.query?.trim().toLowerCase() || ''
  const accounts = input.accounts.filter(account => (!input.status || account.status === input.status)
    && (!input.type || String(account.accountType) === input.type)
    && (!query || `${account.accountNumber} ${account.accountName} ${controls.get(account.accountHeaderId)?.accountHeaderName || ''}`.toLowerCase().includes(query)))
    .sort((a, b) => a.accountType - b.accountType || (controls.get(a.accountHeaderId)?.accountHeaderName || '').localeCompare(controls.get(b.accountHeaderId)?.accountHeaderName || '') || a.accountNumber.localeCompare(b.accountNumber, 'en', { numeric: true }) || a.id.localeCompare(b.id))
  const sections = new Map<string, { title: string; rows: string[][] }>()
  for (const account of accounts) {
    const type = types[account.accountType] || 'Unknown'
    const path = controls.get(account.accountHeaderId)?.accountHeaderName || 'Unavailable control'
    const key = JSON.stringify([account.accountType, account.accountHeaderId])
    let section = sections.get(key)
    if (!section) { section = { title: path.toLowerCase().startsWith(type.toLowerCase()) ? path : `${type} / ${path}`, rows: [] }; sections.set(key, section) }
    const currency = currencies.get(account.currencyId || input.baseCurrencyId) || (account.currencyId ? 'Unavailable currency' : 'Unit base currency (unavailable)')
    section.rows.push([account.accountNumber, account.accountName, currency])
  }
  const filters = [input.status ? `Status: ${input.status}` : 'All statuses', input.type ? `Type: ${types[Number(input.type)] || 'Unknown'}` : 'All account types', query ? `Search: ${input.query!.trim()}` : ''].filter(Boolean)
  return { id: 'chart-of-accounts', title: 'CHART OF ACCOUNTS', companyName: input.companyName || 'Company profile not configured', subtitle: `${input.unitName} · ${filters.join(' · ')}`, generatedAt: input.generatedAt,
    columns: [{ key: 'number', title: 'Account No.', width: 19 }, { key: 'name', title: 'Account Name', width: 59 }, { key: 'currency', title: 'Currency', width: 22 }], sections: [...sections.values()] }
}
