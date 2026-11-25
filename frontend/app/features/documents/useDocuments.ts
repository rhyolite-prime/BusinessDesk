import type {
  DmFolder,
  DmTemplate,
  DmRetentionPolicy,
  DmDocument,
  DmVersion,
  DmWorkflow,
  DmNote,
  DmRelation,
  DmSavedSearch,
  DmAuditEvent,
  DmSummary,
  DmTrashItem,
  DmCollection,
  DmTag,
  DmCustomAttribute,
  DmCustomIdentifier,
  DmAclEntry,
  DmShare,
  DmLegalHold,
  DmSignature,
  DmEntityLink,
  DmQuota,
  DmSettings,
  DmWorkflowTemplate,
  DmWorkflowTask,
  DmAnnotation,
} from './document-types'

export function useDocumentsUnitId() {
  return useState<string>('ledger-accounting-unit', () => '')
}

export function useDocuments() {
  const unitId = useDocumentsUnitId()

  const withUnit = (query: Record<string, any> = {}) => ({
    ...query,
    accountingUnitId: query.accountingUnitId ?? unitId.value,
  })

  return {
    async summary(): Promise<DmSummary> {
      return await $fetch<DmSummary>('/api/documents/summary', {
        query: withUnit(),
      })
    },

    async nextNumber(): Promise<string> {
      const res = await $fetch<{ nextNumber: string }>('/api/documents/next-number', {
        query: withUnit(),
      })
      return res.nextNumber
    },

    // Folders
    async folders(): Promise<DmFolder[]> {
      const res = await $fetch<{ data: DmFolder[]; totalCount: number }>('/api/documents/folders', {
        query: withUnit(),
      })
      return res.data
    },

    async folder(id: string): Promise<DmFolder> {
      return await $fetch<DmFolder>(`/api/documents/folders/${id}`)
    },

    async createFolder(body: Partial<DmFolder>): Promise<DmFolder> {
      return await $fetch<DmFolder>('/api/documents/folders', {
        method: 'POST',
        body: withUnit(body),
      })
    },

    async updateFolder(id: string, body: Partial<DmFolder>): Promise<DmFolder> {
      return await $fetch<DmFolder>(`/api/documents/folders/${id}`, {
        method: 'PUT',
        body,
      })
    },

    async deleteFolder(id: string): Promise<void> {
      await $fetch(`/api/documents/folders/${id}`, { method: 'DELETE' })
    },

    // Templates
    async templates(): Promise<DmTemplate[]> {
      const res = await $fetch<{ data: DmTemplate[]; totalCount: number }>('/api/documents/templates')
      return res.data
    },

    async template(id: string): Promise<DmTemplate> {
      return await $fetch<DmTemplate>(`/api/documents/templates/${id}`)
    },

    async createTemplate(body: Partial<DmTemplate>): Promise<DmTemplate> {
      return await $fetch<DmTemplate>('/api/documents/templates', {
        method: 'POST',
        body,
      })
    },

    async updateTemplate(id: string, body: Partial<DmTemplate>): Promise<DmTemplate> {
      return await $fetch<DmTemplate>(`/api/documents/templates/${id}`, {
        method: 'PUT',
        body,
      })
    },

    async deleteTemplate(id: string): Promise<void> {
      await $fetch(`/api/documents/templates/${id}`, { method: 'DELETE' })
    },

    // Retention Policies
    async retentionPolicies(): Promise<DmRetentionPolicy[]> {
      const res = await $fetch<{ data: DmRetentionPolicy[]; totalCount: number }>('/api/documents/retention-policies')
      return res.data
    },

    async createRetentionPolicy(body: Partial<DmRetentionPolicy>): Promise<DmRetentionPolicy> {
      return await $fetch<DmRetentionPolicy>('/api/documents/retention-policies', {
        method: 'POST',
        body,
      })
    },

    async updateRetentionPolicy(id: string, body: Partial<DmRetentionPolicy>): Promise<DmRetentionPolicy> {
      return await $fetch<DmRetentionPolicy>(`/api/documents/retention-policies/${id}`, {
        method: 'PUT',
        body,
      })
    },

    async deleteRetentionPolicy(id: string): Promise<void> {
      await $fetch(`/api/documents/retention-policies/${id}`, { method: 'DELETE' })
    },

    // Documents
    async documents(query: Record<string, any> = {}): Promise<{ data: DmDocument[]; totalCount: number }> {
      return await $fetch<{ data: DmDocument[]; totalCount: number }>('/api/documents/documents', {
        query: withUnit(query),
      })
    },

    async document(id: string): Promise<DmDocument> {
      return await $fetch<DmDocument>(`/api/documents/documents/${id}`)
    },

    async createDocument(body: Partial<DmDocument>): Promise<DmDocument> {
      return await $fetch<DmDocument>('/api/documents/documents', {
        method: 'POST',
        body: withUnit(body),
      })
    },

    async updateDocument(id: string, body: Partial<DmDocument>): Promise<DmDocument> {
      return await $fetch<DmDocument>(`/api/documents/documents/${id}`, {
        method: 'PUT',
        body,
      })
    },

    async deleteDocument(id: string): Promise<void> {
      await $fetch(`/api/documents/documents/${id}`, { method: 'DELETE' })
    },

    async checkoutDocument(id: string): Promise<void> {
      await $fetch(`/api/documents/documents/${id}/checkout`, { method: 'POST' })
    },

    async checkinDocument(id: string, body: { fileName?: string; fileSize?: number; fileHash?: string; mimeType?: string; comment?: string; isMajor?: boolean; contentText?: string }): Promise<void> {
      await $fetch(`/api/documents/documents/${id}/checkin`, {
        method: 'POST',
        body,
      })
    },

    async lockDocument(id: string): Promise<void> {
      await $fetch(`/api/documents/documents/${id}/lock`, { method: 'POST' })
    },

    async unlockDocument(id: string): Promise<void> {
      await $fetch(`/api/documents/documents/${id}/unlock`, { method: 'POST' })
    },

    async bookmarkDocument(id: string): Promise<boolean> {
      const res = await $fetch<{ isBookmarked: boolean }>(`/api/documents/documents/${id}/bookmark`, { method: 'POST' })
      return res.isBookmarked
    },

    // Versions
    async versions(documentId: string): Promise<DmVersion[]> {
      const res = await $fetch<{ data: DmVersion[]; totalCount: number }>(`/api/documents/documents/${documentId}/versions`)
      return res.data
    },

    async revertVersion(documentId: string, versionId: string): Promise<void> {
      await $fetch(`/api/documents/documents/${documentId}/versions/${versionId}/revert`, { method: 'POST' })
    },

    // Workflows
    async submitWorkflow(documentId: string, body: { stepName?: string; assignedToUserId?: string }): Promise<void> {
      await $fetch(`/api/documents/documents/${documentId}/workflow/submit`, {
        method: 'POST',
        body,
      })
    },

    async approveWorkflow(documentId: string, body: { comments?: string; publish?: boolean }): Promise<void> {
      await $fetch(`/api/documents/documents/${documentId}/workflow/approve`, {
        method: 'POST',
        body,
      })
    },

    async rejectWorkflow(documentId: string, body: { comments: string }): Promise<void> {
      await $fetch(`/api/documents/documents/${documentId}/workflow/reject`, {
        method: 'POST',
        body,
      })
    },

    async cancelWorkflow(documentId: string): Promise<void> {
      await $fetch(`/api/documents/documents/${documentId}/workflow/cancel`, { method: 'POST' })
    },

    async workflows(query: Record<string, any> = {}): Promise<{ data: DmWorkflow[]; totalCount: number }> {
      return await $fetch<{ data: DmWorkflow[]; totalCount: number }>('/api/documents/workflows', {
        query,
      })
    },

    // Notes
    async notes(documentId: string): Promise<DmNote[]> {
      const res = await $fetch<{ data: DmNote[]; totalCount: number }>(`/api/documents/documents/${documentId}/notes`)
      return res.data
    },

    async addNote(documentId: string, body: { noteText: string }): Promise<DmNote> {
      return await $fetch<DmNote>(`/api/documents/documents/${documentId}/notes`, {
        method: 'POST',
        body,
      })
    },

    // Relations
    async relations(documentId: string): Promise<DmRelation[]> {
      const res = await $fetch<{ data: DmRelation[]; totalCount: number }>(`/api/documents/documents/${documentId}/relations`)
      return res.data
    },

    async addRelation(documentId: string, body: { targetDocumentId: string; relationType?: string; notes?: string }): Promise<DmRelation> {
      return await $fetch<DmRelation>(`/api/documents/documents/${documentId}/relations`, {
        method: 'POST',
        body,
      })
    },

    async removeRelation(documentId: string, relationId: string): Promise<void> {
      await $fetch(`/api/documents/documents/${documentId}/relations/${relationId}`, { method: 'DELETE' })
    },

    // Saved Searches
    async savedSearches(): Promise<DmSavedSearch[]> {
      const res = await $fetch<{ data: DmSavedSearch[]; totalCount: number }>('/api/documents/saved-searches')
      return res.data
    },

    async createSavedSearch(body: { name: string; description?: string; criteria: Record<string, any> }): Promise<DmSavedSearch> {
      return await $fetch<DmSavedSearch>('/api/documents/saved-searches', {
        method: 'POST',
        body,
      })
    },

    async deleteSavedSearch(id: string): Promise<void> {
      await $fetch(`/api/documents/saved-searches/${id}`, { method: 'DELETE' })
    },

    // Trash
    async trash(): Promise<{ documents: DmTrashItem[]; folders: DmTrashItem[]; totalCount: number }> {
      return await $fetch<{ documents: DmTrashItem[]; folders: DmTrashItem[]; totalCount: number }>('/api/documents/trash', {
        query: withUnit(),
      })
    },

    async restoreTrash(id: string, type: 'document' | 'folder'): Promise<void> {
      await $fetch(`/api/documents/trash/${id}/restore`, {
        method: 'POST',
        body: { type },
      })
    },

    async purgeTrash(id: string): Promise<void> {
      await $fetch(`/api/documents/trash/${id}/purge`, { method: 'DELETE' })
    },

    // Audit
    async audit(query: Record<string, any> = {}): Promise<{ data: DmAuditEvent[]; totalCount: number }> {
      return await $fetch<{ data: DmAuditEvent[]; totalCount: number }>('/api/documents/audit', {
        query,
      })
    },

    async verifyAudit(documentId?: string): Promise<{ verified: boolean; checkedCount: number; status: string }> {
      return await $fetch<{ verified: boolean; checkedCount: number; status: string }>('/api/documents/audit/verify', {
        method: 'POST',
        body: { documentId },
      })
    },

    // Collections
    async collections(): Promise<DmCollection[]> {
      const res = await $fetch<{ data: DmCollection[]; totalCount: number }>('/api/documents/collections', {
        query: withUnit(),
      })
      return res.data
    },

    async createCollection(body: Partial<DmCollection>): Promise<DmCollection> {
      return await $fetch<DmCollection>('/api/documents/collections', {
        method: 'POST',
        body: withUnit(body),
      })
    },

    async deleteCollection(id: string): Promise<void> {
      await $fetch(`/api/documents/collections/${id}`, { method: 'DELETE' })
    },

    // Tags
    async tags(): Promise<DmTag[]> {
      const res = await $fetch<{ data: DmTag[]; totalCount: number }>('/api/documents/tags')
      return res.data
    },

    async createTag(body: { name: string; color?: string; category?: string }): Promise<DmTag> {
      return await $fetch<DmTag>('/api/documents/tags', {
        method: 'POST',
        body,
      })
    },

    async deleteTag(id: string): Promise<void> {
      await $fetch(`/api/documents/tags/${id}`, { method: 'DELETE' })
    },

    // Custom Attributes & Identifiers
    async customAttributes(): Promise<DmCustomAttribute[]> {
      const res = await $fetch<{ data: DmCustomAttribute[]; totalCount: number }>('/api/documents/custom-attributes')
      return res.data
    },

    async customIdentifiers(): Promise<DmCustomIdentifier[]> {
      const res = await $fetch<{ data: DmCustomIdentifier[]; totalCount: number }>('/api/documents/custom-identifiers')
      return res.data
    },

    async generateIdentifier(id: string): Promise<{ identifier: string; sequence: number }> {
      return await $fetch<{ identifier: string; sequence: number }>(`/api/documents/custom-identifiers/${id}/generate`, {
        method: 'POST',
      })
    },

    // ACL & Shares
    async aclEntries(entityType: string, entityId: string): Promise<DmAclEntry[]> {
      const res = await $fetch<{ data: DmAclEntry[]; totalCount: number }>('/api/documents/acl', {
        query: { entityType, entityId },
      })
      return res.data
    },

    async createAclEntry(body: { entityType: string; entityId: string; principalType: string; principalId: string; permission: string; accessType: string }): Promise<DmAclEntry> {
      return await $fetch<DmAclEntry>('/api/documents/acl', {
        method: 'POST',
        body,
      })
    },

    async deleteAclEntry(id: string): Promise<void> {
      await $fetch(`/api/documents/acl/${id}`, { method: 'DELETE' })
    },

    async shares(documentId: string): Promise<DmShare[]> {
      const res = await $fetch<{ data: DmShare[]; totalCount: number }>(`/api/documents/shares/${documentId}`)
      return res.data
    },

    async createShare(documentId: string, body: { recipientEmail?: string; canDownload?: boolean; canComment?: boolean; maxAccessCount?: number }): Promise<DmShare> {
      return await $fetch<DmShare>(`/api/documents/shares/${documentId}`, {
        method: 'POST',
        body,
      })
    },

    async revokeShare(shareId: string): Promise<void> {
      await $fetch(`/api/documents/shares/${shareId}`, { method: 'DELETE' })
    },

    // Legal Holds
    async legalHolds(): Promise<DmLegalHold[]> {
      const res = await $fetch<{ data: DmLegalHold[]; totalCount: number }>('/api/documents/legal-holds')
      return res.data
    },

    async createLegalHold(body: { matterNumber: string; title: string; description?: string; custodianName?: string }): Promise<DmLegalHold> {
      return await $fetch<DmLegalHold>('/api/documents/legal-holds', {
        method: 'POST',
        body,
      })
    },

    async releaseLegalHold(id: string): Promise<void> {
      await $fetch(`/api/documents/legal-holds/${id}`, { method: 'DELETE' })
    },

    async applyLegalHold(holdId: string, documentId: string): Promise<void> {
      await $fetch(`/api/documents/legal-holds/${holdId}/apply`, {
        method: 'POST',
        body: { documentId },
      })
    },

    // Signatures
    async signatures(documentId: string): Promise<DmSignature[]> {
      const res = await $fetch<{ data: DmSignature[]; totalCount: number }>(`/api/documents/signatures/${documentId}`)
      return res.data
    },

    async requestSignature(documentId: string, body: { signerName: string; signerEmail: string; signatureType?: string }): Promise<DmSignature> {
      return await $fetch<DmSignature>(`/api/documents/signatures/${documentId}`, {
        method: 'POST',
        body,
      })
    },

    async signDocument(signatureId: string, notes?: string): Promise<void> {
      await $fetch(`/api/documents/signatures/${signatureId}/sign`, {
        method: 'POST',
        body: { notes: notes || '' },
      })
    },

    async verifySignature(signatureId: string): Promise<{ verified: boolean; signerName: string; signatureHash: string }> {
      return await $fetch(`/api/documents/signatures/${signatureId}/verify`, { method: 'POST' })
    },

    // ERP Entity Links
    async entityLinks(documentId: string): Promise<DmEntityLink[]> {
      const res = await $fetch<{ data: DmEntityLink[]; totalCount: number }>(`/api/documents/entity-links/${documentId}`)
      return res.data
    },

    async createEntityLink(documentId: string, body: { entityType: string; entityId: string; referenceNumber?: string; linkCategory?: string; notes?: string }): Promise<DmEntityLink> {
      return await $fetch<DmEntityLink>(`/api/documents/entity-links/${documentId}`, {
        method: 'POST',
        body,
      })
    },

    async deleteEntityLink(linkId: string): Promise<void> {
      await $fetch(`/api/documents/entity-links/${linkId}`, { method: 'DELETE' })
    },

    // Quotas & Settings
    async quotas(): Promise<DmQuota> {
      return await $fetch<DmQuota>('/api/documents/quotas')
    },

    async settings(): Promise<DmSettings> {
      return await $fetch<DmSettings>('/api/documents/settings')
    },

    async updateSettings(body: Partial<DmSettings>): Promise<void> {
      await $fetch('/api/documents/settings', {
        method: 'PUT',
        body,
      })
    },

    // Workflow Templates & Tasks
    async workflowTemplates(): Promise<DmWorkflowTemplate[]> {
      const res = await $fetch<{ data: DmWorkflowTemplate[]; totalCount: number }>('/api/documents/workflow-templates')
      return res.data
    },

    async createWorkflowTemplate(body: Partial<DmWorkflowTemplate>): Promise<DmWorkflowTemplate> {
      return await $fetch<DmWorkflowTemplate>('/api/documents/workflow-templates', {
        method: 'POST',
        body,
      })
    },

    async deleteWorkflowTemplate(id: string): Promise<void> {
      await $fetch(`/api/documents/workflow-templates/${id}`, { method: 'DELETE' })
    },

    async workflowTasks(): Promise<DmWorkflowTask[]> {
      const res = await $fetch<{ data: DmWorkflowTask[]; totalCount: number }>('/api/documents/workflow-tasks')
      return res.data
    },

    async completeWorkflowTask(taskId: string, decision: 'approved' | 'rejected', comment?: string): Promise<void> {
      await $fetch(`/api/documents/workflow-tasks/${taskId}/complete`, {
        method: 'POST',
        body: { decision, comment: comment || '' },
      })
    },

    // Annotations
    async annotations(documentId: string): Promise<DmAnnotation[]> {
      const res = await $fetch<{ data: DmAnnotation[]; totalCount: number }>(`/api/documents/documents/${documentId}/annotations`)
      return res.data
    },

    async createAnnotation(documentId: string, body: Partial<DmAnnotation>): Promise<DmAnnotation> {
      return await $fetch<DmAnnotation>(`/api/documents/documents/${documentId}/annotations`, {
        method: 'POST',
        body,
      })
    },

    async deleteAnnotation(documentId: string, annotationId: string): Promise<void> {
      await $fetch(`/api/documents/documents/${documentId}/annotations/${annotationId}`, { method: 'DELETE' })
    },

    // AI Operations
    async classify(documentId: string): Promise<{ category: string; confidence: number; signals: string[]; suggestedTags: string[] }> {
      return await $fetch(`/api/documents/ai/${documentId}/classify`, { method: 'POST' })
    },

    async ragQuery(query: string): Promise<{ query: string; answer: string; topConfidence: number; citations: any[] }> {
      return await $fetch('/api/documents/ai/rag', {
        method: 'POST',
        body: { q: query },
      })
    },
  }
}
