import type { AccountDetail } from '../ledger/account-detail-types'
import type { LedgerAccountControl } from '../ledger/setup-data'
import type { EmbeddedReport, ReportSection } from './report-types'

interface Currency { id: string; code: string; name: string }
/** Join by IDs; never by account-number ranges, which may overlap. */
export function chartOfAccountsReport(input: {
  accounts: AccountDetail[]; controls: LedgerAccountControl[]; currencies: Currency[]
  companyName: string; unitName: string; baseCurrencyId: string; generatedAt: string
  status?: string; type?: string; query?: string
}): EmbeddedReport {
  // Backend AccountType enum: primary report order, independent of names/numbers.
  const types = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']
  const accountTypeRank = (value: number) => Number.isInteger(value) && value >= 0 && value < types.length ? value : types.length
  const headingRank = (label: string) => { const rank = types.indexOf(label); return rank < 0 ? types.length : rank }
  const controls = new Map(input.controls.map(control => [control.id, control]))
  const currencies = new Map(input.currencies.map(currency => [currency.id, currency.name || currency.code]))
  const query = input.query?.trim().toLowerCase() || ''
  const accounts = input.accounts.filter(account => (!input.status || account.status === input.status)
    && (!input.type || String(account.accountType) === input.type)
    && (!query || `${account.accountNumber} ${account.accountName} ${controls.get(account.accountHeaderId)?.accountHeaderName || ''}`.toLowerCase().includes(query)))
    .sort((a, b) => accountTypeRank(a.accountType) - accountTypeRank(b.accountType) || (controls.get(a.accountHeaderId)?.accountHeaderName || '').localeCompare(controls.get(b.accountHeaderId)?.accountHeaderName || '') || a.accountNumber.localeCompare(b.accountNumber, 'en', { numeric: true }) || a.id.localeCompare(b.id))
  const sections = new Map<string, ReportSection>()
  for (const account of accounts) {
    const type = types[account.accountType] || 'Unknown'
    const path = controls.get(account.accountHeaderId)?.accountHeaderName || 'Unavailable control'
    const parts = path.split('/').map(part => part.trim()).filter(Boolean)
    const aliases: Record<string, string[]> = { Asset: ['asset', 'assets'], Liability: ['liability', 'liabilities'], Equity: ['equity'], Revenue: ['revenue'], Expense: ['expense', 'expenses'], Unknown: ['unknown'] }
    if (parts[0] && aliases[type]!.includes(parts[0].toLowerCase())) parts.shift()
    const hierarchy = [type, ...parts]
    const key = JSON.stringify([account.accountType, hierarchy])
    let section = sections.get(key)
    if (!section) { section = { title: hierarchy.join(' / '), path: hierarchy, rows: [] }; sections.set(key, section) }
    const currency = currencies.get(account.currencyId || input.baseCurrencyId) || (account.currencyId ? 'Unavailable currency' : 'Unit base currency (unavailable)')
    section.rows.push([account.accountNumber, account.accountName, currency])
  }
  // Rank each sibling branch by its lowest posting-account number, including
  // descendants. Keep prefixes together so shared headings are emitted once.
  const branchMinimum = new Map<string, string>()
  const compareNumber = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true })
  for (const section of sections.values()) {
    for (const row of section.rows) {
      for (let depth = 1; depth <= section.path!.length; depth++) {
        const key = JSON.stringify(section.path!.slice(0, depth)), previous = branchMinimum.get(key)
        if (previous === undefined || compareNumber(row[0]!, previous) < 0) branchMinimum.set(key, row[0]!)
      }
    }
  }
  const orderedSections = [...sections.values()].sort((a, b) => {
    const first = a.path!, second = b.path!
    const typeOrder = headingRank(first[0]!) - headingRank(second[0]!)
    if (typeOrder) return typeOrder
    for (let i = 1; i < Math.min(first.length, second.length); i++) {
      if (first[i] !== second[i]) {
        const firstMinimum = branchMinimum.get(JSON.stringify(first.slice(0, i + 1)))!
        const secondMinimum = branchMinimum.get(JSON.stringify(second.slice(0, i + 1)))!
        return compareNumber(firstMinimum, secondMinimum) || first[i]!.localeCompare(second[i]!)
      }
    }
    return first.length - second.length
  })
  for (const section of orderedSections) section.rows.sort((a, b) => a[0]!.localeCompare(b[0]!, 'en', { numeric: true }) || a[1]!.localeCompare(b[1]!))
  const filters = [input.status ? `Status: ${input.status}` : 'All statuses', input.type ? `Type: ${types[Number(input.type)] || 'Unknown'}` : 'All account types', query ? `Search: ${input.query!.trim()}` : ''].filter(Boolean)
  return { id: 'chart-of-accounts', title: 'CHART OF ACCOUNTS', companyName: input.companyName || 'Company profile not configured', subtitle: `${input.unitName} · ${filters.join(' · ')}`, generatedAt: input.generatedAt,
    columns: [{ key: 'number', title: 'Account No.', width: 19 }, { key: 'name', title: 'Account Name', width: 59 }, { key: 'currency', title: 'Currency', width: 22 }], sections: orderedSections }
}
