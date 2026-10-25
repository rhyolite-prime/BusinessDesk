/** Code-defined ERP reports only. No executable templates or designer uploads. */
export interface ReportColumn { key: string; title: string; width: number }
export interface ReportSection { title: string; path?: string[]; rows: string[][] }
export interface EmbeddedReport {
  id: string
  title: string
  companyName: string
  subtitle: string
  generatedAt: string
  columns: ReportColumn[]
  sections: ReportSection[]
}
export const embeddedReports = {
  'chart-of-accounts': { title: 'CHART OF ACCOUNTS', route: '/ledger/reports/chart-of-accounts' },
} as const

export type ReportColorMode = 'color' | 'monochrome'
