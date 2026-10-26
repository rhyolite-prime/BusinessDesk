import { buildAccountHeadTree } from './account-head-tree'
/** Parent UUIDs define groups; names and full paths are presentation only. */
export function costCenterOptions(centers: readonly { id: string; name: string; parentId?: string | null }[]) {
  const rows = buildAccountHeadTree(centers.map(center => ({ ...center, parentId: center.parentId || null, sortOrder: 0, standardAccountType: 'Asset' as const, isActive: true })))
  const paths = new Map(rows.map(row => [row.head.id, row.path]))
  return rows.map(row => {
    const parentId = row.head.parentId
    return {
      id: row.head.id,
      label: row.path,
      groupKey: parentId ? `parent:${parentId}` : 'root',
      type: parentId ? paths.get(parentId) || 'Unavailable parent' : 'Top-level cost centers',
    }
  })
}
