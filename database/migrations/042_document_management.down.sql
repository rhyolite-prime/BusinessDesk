BEGIN;

DELETE FROM core_tenant_reset_registry WHERE table_name IN (
 'dm_audit_events',
 'dm_saved_searches',
 'dm_bookmarks',
 'dm_document_notes',
 'dm_document_relations',
 'dm_workflows',
 'dm_document_versions',
 'dm_documents',
 'dm_templates',
 'dm_retention_policies',
 'dm_folders',
 'dm_document_sequences'
);

DROP TABLE IF EXISTS dm_audit_events;
DROP TABLE IF EXISTS dm_saved_searches;
DROP TABLE IF EXISTS dm_bookmarks;
DROP TABLE IF EXISTS dm_document_notes;
DROP TABLE IF EXISTS dm_document_relations;
DROP TABLE IF EXISTS dm_workflows;
DROP TABLE IF EXISTS dm_document_versions;
DROP TABLE IF EXISTS dm_documents;
DROP TABLE IF EXISTS dm_templates;
DROP TABLE IF EXISTS dm_retention_policies;
DROP TABLE IF EXISTS dm_folders;
DROP TABLE IF EXISTS dm_document_sequences;

COMMIT;
