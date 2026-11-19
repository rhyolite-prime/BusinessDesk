export interface ModuleNavLink {
  label: string
  to?: string
  icon: string
  comingSoon?: boolean
}

export interface ModuleNavGroup {
  title: string
  icon: string
  links: ModuleNavLink[]
}

export interface ModulePageDefinition {
  path: string
  title: string
  description: string
  icon: string
}

export const documentPages: ModulePageDefinition[] = [
  {
    path: '/documents',
    title: 'Document management overview',
    description: 'Centralized repository metrics, recent records, active checkouts, and pending reviews.',
    icon: 'home',
  },
  {
    path: '/documents/explorer',
    title: 'Document explorer',
    description: 'Hierarchical folder taxonomy, file upload, version history, check-in/check-out, and document preview.',
    icon: 'folder',
  },
  {
    path: '/documents/search',
    title: 'Advanced & parametric search',
    description: 'Fast full-text retrieval, parametric filters, tag searches, and saved query management.',
    icon: 'magnifying-glass',
  },
  {
    path: '/documents/approvals',
    title: 'Review & approval workflows',
    description: 'Workflow task queue for document reviews, approvals, rejections, and decision audits.',
    icon: 'document-check',
  },
  {
    path: '/documents/templates',
    title: 'Metadata templates',
    description: 'Document types and configurable custom field schemas (text, number, date, options, boolean).',
    icon: 'rectangle-stack',
  },
  {
    path: '/documents/retention',
    title: 'Retention & compliance',
    description: 'Compliance policies, retention schedules, expiration monitoring, and archival disposition.',
    icon: 'shield-check',
  },
  {
    path: '/documents/trash',
    title: 'Recycle bin',
    description: 'Soft-deleted records with one-click restore and administrative permanent purging.',
    icon: 'trash',
  },
  {
    path: '/documents/audit',
    title: 'Audit trail log',
    description: 'Immutable timeline of every document access, edit, status transition, and administrative action.',
    icon: 'clipboard-document-list',
  },
]

export const documentNavigationGroups: ModuleNavGroup[] = [
  {
    title: 'Library',
    icon: 'folder',
    links: [
      { label: 'Explorer', to: '/documents/explorer', icon: 'folder' },
      { label: 'Search', to: '/documents/search', icon: 'magnifying-glass' },
    ],
  },
  {
    title: 'Workflows',
    icon: 'document-check',
    links: [
      { label: 'Approvals queue', to: '/documents/approvals', icon: 'document-check' },
    ],
  },
  {
    title: 'Configuration',
    icon: 'cog-6-tooth',
    links: [
      { label: 'Metadata templates', to: '/documents/templates', icon: 'rectangle-stack' },
      { label: 'Retention policies', to: '/documents/retention', icon: 'shield-check' },
    ],
  },
  {
    title: 'Governance',
    icon: 'shield-check',
    links: [
      { label: 'Recycle bin', to: '/documents/trash', icon: 'trash' },
      { label: 'Audit trail', to: '/documents/audit', icon: 'clipboard-document-list' },
    ],
  },
  {
    title: 'Account',
    icon: 'user',
    links: [
      { label: 'Preferences', to: '/preferences', icon: 'cog-6-tooth' },
      { label: 'Account & subscription', to: '/account', icon: 'building-office' },
    ],
  },
]

export function documentPageByPath(path: string): ModulePageDefinition | undefined {
  return documentPages
    .filter((page) => path === page.path || path.startsWith(`${page.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]
}

export const documentSearchItems = documentPages
  .filter((page) => page.path !== '/documents')
  .map((page) => ({ label: page.title, detail: page.description, to: page.path }))
