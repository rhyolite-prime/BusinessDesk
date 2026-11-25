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
    path: '/documents/collections',
    title: 'Document collections',
    description: 'Virtual cross-unit document collections for projects, executive briefs, and departments.',
    icon: 'rectangle-stack',
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
    path: '/documents/workflow-templates',
    title: 'Workflow engine & templates',
    description: 'Multi-step workflow builder with sequential and parallel tasks, triggers, and condition rules.',
    icon: 'arrows-pointing-in',
  },
  {
    path: '/documents/signatures',
    title: 'Electronic signatures',
    description: 'Digital signature requests, document signing, and SHA-256 cryptographic verification.',
    icon: 'pencil-square',
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
    path: '/documents/legal-holds',
    title: 'Litigation legal holds',
    description: 'Litigation and compliance freeze holds protecting sensitive documents from disposal or purging.',
    icon: 'lock-closed',
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
    description: 'Tamper-evident SHA-256 hash-chain audit log with cryptographic integrity verification.',
    icon: 'clipboard-document-list',
  },
  {
    path: '/documents/settings',
    title: 'Settings & Quotas',
    description: 'Tenant storage quotas, ClamAV malware scanning, OCR extraction, and AI feature configuration.',
    icon: 'cog-6-tooth',
  },
]

export const documentNavigationGroups: ModuleNavGroup[] = [
  {
    title: 'Library',
    icon: 'folder',
    links: [
      { label: 'Explorer', to: '/documents/explorer', icon: 'folder' },
      { label: 'Collections', to: '/documents/collections', icon: 'rectangle-stack' },
      { label: 'Search', to: '/documents/search', icon: 'magnifying-glass' },
    ],
  },
  {
    title: 'Workflows',
    icon: 'document-check',
    links: [
      { label: 'Approvals queue', to: '/documents/approvals', icon: 'document-check' },
      { label: 'Workflow templates', to: '/documents/workflow-templates', icon: 'arrows-pointing-in' },
      { label: 'E-Signatures', to: '/documents/signatures', icon: 'pencil-square' },
    ],
  },
  {
    title: 'Governance',
    icon: 'shield-check',
    links: [
      { label: 'Legal holds', to: '/documents/legal-holds', icon: 'lock-closed' },
      { label: 'Recycle bin', to: '/documents/trash', icon: 'trash' },
      { label: 'Audit trail', to: '/documents/audit', icon: 'clipboard-document-list' },
    ],
  },
  {
    title: 'Configuration',
    icon: 'cog-6-tooth',
    links: [
      { label: 'Metadata templates', to: '/documents/templates', icon: 'rectangle-stack' },
      { label: 'Retention policies', to: '/documents/retention', icon: 'shield-check' },
      { label: 'Settings & Quotas', to: '/documents/settings', icon: 'cog-6-tooth' },
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
