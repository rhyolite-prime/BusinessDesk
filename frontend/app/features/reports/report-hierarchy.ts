import type { EmbeddedReport } from './report-types'
export type ReportHierarchyRow =
  | { kind: 'heading'; label: string; depth: number; shaded: boolean }
  | { kind: 'record'; cells: string[]; depth: number; fullWidth?: boolean; emphasized?: boolean; grandTotal?: boolean }
/** Emit shared prefixes once, without deduplicating any account records. */
export function reportHierarchyRows(report: EmbeddedReport): ReportHierarchyRow[] {
  const result: ReportHierarchyRow[] = []
  let previous: string[] = []
  for (const section of report.sections) {
    const path = section.path?.length ? section.path : section.hideHeading ? [] : [section.title]
    let common = 0
    while (common < path.length && common < previous.length && path[common] === previous[common]) common++
    for (let depth = common; depth < path.length; depth++) result.push({ kind: 'heading', label: path[depth]!, depth, shaded: !section.path })
    for (const cells of section.rows) result.push({ kind: 'record', cells, depth: path.length, ...(cells.some(cell=>/^grand total\b/i.test(cell.trim())) ? {grandTotal:true} : {}), ...(section.emphasized ? {emphasized:true} : {}), ...(section.title === 'Report notes' ? { fullWidth: true } : {}) })
    previous = path
  }
  return result
}
