/** Join hierarchy paths without repeating their shared boundary segments.
 * Do not deduplicate within a path: repeated names can be legitimate nodes.
 */
export function joinAccountHierarchyPaths(...paths: string[]): string {
  const result: string[] = []
  for (const path of paths) {
    const parts = path.split(' / ').map(part => part.trim()).filter(Boolean)
    let overlap = Math.min(result.length, parts.length)
    while (overlap > 0 && !parts.slice(0, overlap).every((part, index) => part === result[result.length - overlap + index])) overlap--
    result.push(...parts.slice(overlap))
  }
  return result.join(' / ')
}
