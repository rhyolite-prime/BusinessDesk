import type { LedgerAccountControl } from './setup-data'

export interface ControlNameRow {
  key: string
  pathKey: string
  ancestors: string[]
  label: string
  path: string
  depth: number
  hasChildren: boolean
  control: LedgerAccountControl | null
}
interface Node { parts: string[]; children: Map<string, Node>; records: LedgerAccountControl[]; min: number }
const rootOrder = ['unknown', 'asset', 'assets', 'liability', 'liabilities', 'equity', 'revenue', 'expense', 'expenses']
/** Presentation only: name prefixes are not persisted parent-control relationships. */
export function buildControlNameTree(controls: readonly LedgerAccountControl[]): ControlNameRow[] {
  const roots = new Map<string, Node>()
  for (const control of controls) {
    const parts = control.accountHeaderName.split('/').map(part => part.trim()).filter(Boolean)
    if (!parts.length) parts.push('Unnamed control')
    let siblings = roots
    parts.forEach((part, index) => {
      let node = siblings.get(part)
      if (!node) { node = { parts: parts.slice(0, index + 1), children: new Map(), records: [], min: Infinity }; siblings.set(part, node) }
      node.min = Math.min(node.min, control.minAccount)
      if (index === parts.length - 1) node.records.push(control)
      siblings = node.children
    })
  }
  const rows: ControlNameRow[] = []
  const rank = (label: string) => { const index = rootOrder.indexOf(label.toLowerCase()); return index < 0 ? rootOrder.length : index }
  function visit(nodes: Map<string, Node>, ancestors: string[]) {
    const sorted = [...nodes.values()].sort((a, b) => (ancestors.length ? 0 : rank(a.parts[0]!) - rank(b.parts[0]!)) || a.min - b.min || a.parts.at(-1)!.localeCompare(b.parts.at(-1)!))
    for (const node of sorted) {
      const pathKey = JSON.stringify(node.parts)
      const records = [...node.records].sort((a, b) => a.minAccount - b.minAccount || a.maxAccount - b.maxAccount || a.id.localeCompare(b.id))
      for (const [index, control] of (records.length ? records : [null]).entries()) {
        rows.push({ key: control ? `record:${control.id}` : `group:${pathKey}`, pathKey, ancestors, label: node.parts.at(-1)!, path: node.parts.join(' / '), depth: ancestors.length, hasChildren: index === 0 && node.children.size > 0, control })
      }
      visit(node.children, [...ancestors, pathKey])
    }
  }
  visit(roots, [])
  return rows
}

export function filterControlNameTree(rows: readonly ControlNameRow[], query: string): ControlNameRow[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return [...rows]
  const matches = rows.filter(row => {
    const control = row.control
    return control && terms.every(term => `${row.path} ${control.minAccount} ${control.maxAccount}`.toLowerCase().includes(term))
  })
  const keys = new Set(matches.map(row => row.key))
  const ancestors = new Set(matches.flatMap(row => row.ancestors))
  return rows.filter(row => keys.has(row.key) || ancestors.has(row.pathKey))
}
