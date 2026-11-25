BEGIN;

-- ===========================================================================
-- Document Management Enterprise Module Down Migration
-- ===========================================================================

DELETE FROM core_tenant_reset_registry WHERE table_name IN (
 'dm_collections',
 'dm_tags',
 'dm_document_tags',
 'dm_custom_attributes',
 'dm_metadata_values',
 'dm_custom_identifiers',
 'dm_acl_entries',
 'dm_shares',
 'dm_legal_holds',
 'dm_document_legal_holds',
 'dm_signatures',
 'dm_entity_links',
 'dm_embeddings',
 'dm_document_events',
 'dm_quotas',
 'dm_ingest_jobs',
 'dm_settings',
 'dm_workflow_templates',
 'dm_workflow_instances',
 'dm_workflow_tasks',
 'dm_annotations',
 'dm_outbox'
);

DROP TABLE IF EXISTS dm_outbox;
DROP TABLE IF EXISTS dm_annotations;
DROP TABLE IF EXISTS dm_workflow_tasks;
DROP TABLE IF EXISTS dm_workflow_instances;
DROP TABLE IF EXISTS dm_workflow_templates;
DROP TABLE IF EXISTS dm_settings;
DROP TABLE IF EXISTS dm_ingest_jobs;
DROP TABLE IF EXISTS dm_quotas;
DROP TABLE IF EXISTS dm_document_events;
DROP TABLE IF EXISTS dm_embeddings;
DROP TABLE IF EXISTS dm_entity_links;
DROP TABLE IF EXISTS dm_signatures;
DROP TABLE IF EXISTS dm_document_legal_holds;
DROP TABLE IF EXISTS dm_legal_holds;
DROP TABLE IF EXISTS dm_shares;
DROP TABLE IF EXISTS dm_acl_entries;
DROP TABLE IF EXISTS dm_custom_identifiers;
DROP TABLE IF EXISTS dm_metadata_values;
DROP TABLE IF EXISTS dm_custom_attributes;
DROP TABLE IF EXISTS dm_document_tags;
DROP TABLE IF EXISTS dm_tags;
DROP TABLE IF EXISTS dm_collections;

ALTER TABLE dm_audit_events
 DROP COLUMN IF EXISTS curr_hash,
 DROP COLUMN IF EXISTS prev_hash;

COMMIT;
