import { reportCatalog, type ReportKind } from './financial-reports'
export type LedgerReportKind = ReportKind | 'chart-of-accounts'
export const reportGroups: {label:string;reports:readonly (readonly [LedgerReportKind,string])[]}[] = [
 {label:'Account listings',reports:[['chart-of-accounts','Chart of Accounts']]},
 {label:'Ledger activity',reports:reportCatalog.filter(([id])=>['journal-register','general-ledger','cost-center'].includes(id))},
 {label:'Financial statements',reports:reportCatalog.filter(([id])=>['trial-balance','balance-sheet'].includes(id))},
 {label:'Income & operating statements',reports:reportCatalog.filter(([id])=>id.startsWith('income-'))},
]
// Preserve visibility of existing menu placeholders without offering unimplemented reports.
export const plannedReportGroups = [
 {label:'Voucher',reports:['Voucher','Official Voucher','VAT Returns','Receipt Voucher']},
 {label:'Accountable Imprest',reports:['Statement','By Employee','By Category','Overdue Imprest']},
 {label:'Reconciliation',reports:['Reconciliation','Statement','Statement History','Reconciliation History']},
 {label:'Petty Cash',reports:['By Account','By OU','By Batch','By Recipient/Beneficiary']},
 {label:'H/W',reports:['General','By Date','Posted Cheques']},
]
