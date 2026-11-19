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
  }
}
