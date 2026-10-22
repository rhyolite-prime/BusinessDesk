import type { LedgerAccountHead } from './setup-data'

export interface AccountHeadTreeRow {
  head: LedgerAccountHead
  depth: number
  path: string
}

/** API pages are ID-ordered, not tree-ordered. Build the tree after all pages load. */
export function buildAccountHeadTree(heads: readonly LedgerAccountHead[]): AccountHeadTreeRow[] {
  const byId = new Map(heads.map(head => [head.id, head]))
  const children = new Map<string, LedgerAccountHead[]>()
  const roots: LedgerAccountHead[] = []
  for (const head of byId.values()) {
    if (!head.parentId || !byId.has(head.parentId) || head.parentId === head.id) roots.push(head)
    else {
      const siblings = children.get(head.parentId) || []
      siblings.push(head)
      children.set(head.parentId, siblings)
    }
  }
  const compare = (a: LedgerAccountHead, b: LedgerAccountHead) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
  roots.sort(compare)
  for (const siblings of children.values()) siblings.sort(compare)
  const rows: AccountHeadTreeRow[] = []
  const visited = new Set<string>()
  function append(root: LedgerAccountHead) {
    const stack: AccountHeadTreeRow[] = [{ head: root, depth: 0, path: root.name }]
    while (stack.length) {
      const row = stack.pop()!
      if (visited.has(row.head.id)) continue
      visited.add(row.head.id)
      rows.push(row)
      const descendants = children.get(row.head.id) || []
      for (let index = descendants.length - 1; index >= 0; index--) {
        const head = descendants[index]!
        stack.push({ head, depth: row.depth + 1, path: `${row.path} / ${head.name}` })
      }
    }
  }
  for (const root of roots) append(root)
  // Defensive fallback: malformed cycles should neither hang nor hide records.
  for (const head of [...byId.values()].sort(compare)) if (!visited.has(head.id)) append(head)
  return rows
}

/** Retain ancestors of matches so search results still show their tree context. */
export function filterAccountHeadTree(rows: readonly AccountHeadTreeRow[], search = '', type = ''): AccountHeadTreeRow[] {
  const term = search.trim().toLowerCase()
  const included = new Set<string>()
  const ancestors: AccountHeadTreeRow[] = []
  for (const row of rows) {
    ancestors.length = row.depth
    if ((!type || row.head.standardAccountType === type) && (!term || row.path.toLowerCase().includes(term))) {
      included.add(row.head.id)
      for (const ancestor of ancestors) if (ancestor) included.add(ancestor.head.id)
    }
    ancestors[row.depth] = row
  }
  return rows.filter(row => included.has(row.head.id))
}
