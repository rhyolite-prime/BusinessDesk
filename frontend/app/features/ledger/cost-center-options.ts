import { buildAccountHeadTree } from './account-head-tree'
/** Keep UUIDs authoritative; show full paths and group by top-level cost center. */
export function costCenterOptions(centers: readonly { id: string; name: string; parentId?: string | null }[]) {
  const rows = buildAccountHeadTree(centers.map(center => ({ ...center, parentId: center.parentId || null, sortOrder: 0, standardAccountType: 'Asset' as const, isActive: true })))
  let group = ''
  return rows.map(row => {
    if (row.depth === 0) group = row.head.name
    return { id: row.head.id, label: row.path, type: group }
  })
}
