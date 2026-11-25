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
  prevHash?: string
  currHash?: string
  createdAt: string
}

export interface DmCollection {
  id: string
  name: string
  description?: string
  color?: string
  icon?: string
  isPublic: boolean
  documentCount?: number
  version: number
  createdAt: string
}

export interface DmTag {
  id: string
  name: string
  color: string
  category: string
  usageCount: number
  version: number
  createdAt: string
}

export interface DmCustomAttribute {
  id: string
  templateId?: string | null
  attributeKey: string
  label: string
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'select' | 'json'
  isRequired: boolean
  defaultValue?: string
  version: number
  createdAt: string
}

export interface DmCustomIdentifier {
  id: string
  name: string
  pattern: string
  prefix: string
  suffix?: string
  nextSeq: number
  padding: number
  resetCycle: 'none' | 'yearly' | 'monthly'
  version: number
  createdAt: string
}

export interface DmAclEntry {
  id: string
  entityType: 'document' | 'folder' | 'collection'
  entityId: string
  principalType: 'user' | 'role' | 'group' | 'all'
  principalId: string
  permission: 'read' | 'write' | 'delete' | 'share' | 'sign' | 'admin'
  accessType: 'allow' | 'deny'
  isInherited: boolean
  createdAt: string
}

export interface DmShare {
  id: string
  shareToken: string
  recipientEmail?: string
  canDownload: boolean
  canComment: boolean
  expiresAt?: string | null
  maxAccessCount: number
  accessCount: number
  isRevoked: boolean
  createdAt: string
}

export interface DmLegalHold {
  id: string
  matterNumber: string
  title: string
  description?: string
  custodianName?: string
  status: 'active' | 'released'
  appliedAt: string
  attachedDocumentCount?: number
}

export interface DmSignature {
  id: string
  signerName: string
  signerEmail: string
  signatureType: 'electronic' | 'cryptographic' | 'stamp'
  status: 'pending' | 'signed' | 'declined' | 'revoked'
  signatureHash?: string
  signedAt?: string | null
  createdAt: string
}

export interface DmEntityLink {
  id: string
  entityType: string
  entityId: string
  referenceNumber: string
  linkCategory: string
  notes?: string
  createdAt: string
}

export interface DmQuota {
  id?: string
  maxStorageBytes: number
  usedStorageBytes: number
  maxDocuments: number
  documentCount: number
  maxFileSizeBytes: number
  storagePercent?: number
}

export interface DmSettings {
  id?: string
  storageProvider: 'local' | 'cloudinary' | 's3'
  clamavEnabled: boolean
  clamavHost: string
  clamavPort: number
  piiDetectionEnabled: boolean
  ocrEnabled: boolean
  ocrLanguage: string
  aiClassificationEnabled: boolean
  aiRagEnabled: boolean
  defaultRetentionDays: number
}

export interface DmWorkflowTemplate {
  id: string
  name: string
  description?: string
  triggerType: 'manual' | 'on_upload' | 'on_status'
  steps: Array<{
    name: string
    taskType: 'approval' | 'review' | 'sign' | 'input'
    executionMode: 'sequential' | 'parallel'
    assignedRole?: string
  }>
  isActive: boolean
  version: number
  createdAt: string
}

export interface DmWorkflowTask {
  id: string
  instanceId: string
  stepName: string
  taskType: string
  executionMode: string
  status: 'pending' | 'approved' | 'rejected' | 'skipped' | 'escalated'
  dueDate?: string | null
  documentId?: string
  documentTitle?: string
  documentNumber?: string
  createdAt: string
}

export interface DmAnnotation {
  id: string
  pageNumber: number
  annotationType: 'highlight' | 'rect' | 'note' | 'point' | 'redaction'
  rectX: number
  rectY: number
  rectW: number
  rectH: number
  color: string
  content?: string
  isResolved: boolean
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
