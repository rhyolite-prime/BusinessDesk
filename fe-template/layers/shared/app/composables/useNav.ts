/**
 * Navigation registry.
 * Module layers self-register their sidebar sections/items via a Nuxt
 * plugin (e.g. plugins/nav.ts) — the shared layout renders whatever the
 * loaded layers contribute, so adding a module automatically extends
 * the navigation without editing the shell.
 */

export interface NavItem {
  label: string
  to: string
  icon: string
  badge?: number | string
}
export interface NavSection {
  key: string
  label: string
  icon?: string
  order: number
  items: NavItem[]
}

export function useNavRegistry() {
  return useState<NavSection[]>('tl-nav-sections', () => [])
}

export function useNavigation() {
  const sections = useNavRegistry()

  function register(key: string, section: { label: string; icon?: string; order: number }) {
    if (!sections.value.find(s => s.key === key)) {
      sections.value.push({ key, items: [], ...section })
      sections.value.sort((a, b) => a.order - b.order)
    }
  }
  function addItem(sectionKey: string, item: NavItem) {
    const s = sections.value.find(x => x.key === sectionKey)
    if (s && !s.items.find(i => i.to === item.to)) s.items.push(item)
  }
  const sorted = computed(() =>
    [...sections.value].sort((a, b) => a.order - b.order),
  )
  return { sections: sorted, register, addItem }
}
