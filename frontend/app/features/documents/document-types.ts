export interface DmBreadcrumb {
  id: string
  name: string
}

export interface DmFolder {
  id: string
  parentId?: string | null
  accountingUnitId?: string | null
  name: string
  description?: string
  color?: string
  icon?: string
  path: string
  isSystem?: boolean
  documentCount?: number
  version: number
  createdAt: string
  lastModifiedAt?: string | null
  breadcrumbs?: DmBreadcrumb[]
}

export interface DmTemplateField {
  name: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'select'
  required?: boolean
  options?: string[]
  defaultValue?: any
}

export interface DmTemplate {
  id: string
  name: string
  code: string
  description?: string
  schema: DmTemplateField[]
  defaultRetentionPolicyId?: string | null
  retentionPolicyName?: string
  isActive: boolean
  version: number
  createdAt: string
}

export interface DmRetentionPolicy {
  id: string
  name: string
  description?: string
  retentionDays: number
  dispositionAction: 'archive' | 'review' | 'dispose'
  isActive: boolean
  version: number
  createdAt: string
}

export interface DmDocument {
  id: string
  accountingUnitId: string
  folderId?: string | null
  folderName?: string
  folderPath?: string
  templateId?: string | null
  templateName?: string
  templateSchema?: DmTemplateField[]
  documentNumber: string
  title: string
  fileName: string
  description?: string
  language: string
  mimeType: string
  fileSize: number
  fileHash?: string
  contentText?: string
  storagePath?: string
  versionLabel: string
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'published' | 'archived'
  isCheckedOut: boolean
  checkedOutByUserId?: string | null
  checkedOutByUserName?: string
  checkedOutAt?: string | null
  isLocked: boolean
  lockedByUserId?: string | null
  lockedAt?: string | null
  tags: string[]
  attributes: Record<string, any>
  retentionPolicyId?: string | null
  retentionPolicyName?: string
  retentionDate?: string | null
  isExpired: boolean
  isBookmarked?: boolean
  canCheckIn?: boolean
  canCheckOut?: boolean
  version: number
  createdAt: string
  lastModifiedAt?: string | null
}

export interface DmVersion {
  id: string
  versionLabel: string
  fileName: string
  fileSize: number
  fileHash?: string
  mimeType: string
  comment?: string
  userName?: string
  createdAt: string
}

export interface DmWorkflow {
  id: string
  documentId: string
  documentNumber: string
  documentTitle: string
  versionLabel: string
  stepName: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  assignedToUserId?: string | null
  assigneeName?: string
  decidedByUserId?: string | null
  deciderName?: string
  decidedAt?: string | null
  comments?: string
  creatorName?: string
  createdAt: string
}

export interface DmNote {
  id: string
  noteText: string
  userId: string
  userName: string
  createdAt: string
}

export interface DmRelation {
  id: string
  isOutbound: boolean
  relatedDocumentId: string
  relatedDocumentNumber: string
  relatedDocumentTitle: string
  relatedDocumentStatus: string
  relatedDocumentVersion: string
  relationType: 'relates_to' | 'supersedes' | 'supports' | 'amends'
  notes?: string
  createdAt: string
}

export interface DmSavedSearch {
  id: string
  name: string
  description?: string
  criteria: Record<string, any>
  createdAt: string
}

export interface DmAuditEvent {
  id: string
  documentId?: string | null
  folderId?: string | null
  documentNumber?: string
  documentTitle?: string
  eventType: string
  userId: string
  userName: string
  details: Record<string, any>
  createdAt: string
}

export interface DmTrashItem {
  id: string
  type: 'document' | 'folder'
  documentNumber?: string
  title: string
  fileName?: string
  versionLabel?: string
  fileSize?: number
  path?: string
  deletedAt?: string | null
  deletedBy?: string
}

export interface DmSummary {
  totalDocuments: number
  totalFolders: number
  totalStorageBytes: number
  pendingApprovals: number
  activeCheckouts: number
  expiredDocuments: number
  statusBreakdown: Record<string, number>
  templateBreakdown: Record<string, number>
  recentActivity: Array<{
    id: string
    eventType: string
    userName: string
    documentNumber: string
    documentTitle: string
    createdAt: string
  }>
}
