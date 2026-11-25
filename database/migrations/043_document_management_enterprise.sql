BEGIN;

-- ===========================================================================
-- Document Management Enterprise Module Extension
-- Extends LogicalDOC DMS with Enterprise Entities:
--   1. dm_collections           - Virtual cross-unit document collections
--   2. dm_tags                  - Controlled tag taxonomy and usage counters
--   3. dm_document_tags         - Document tag associations
--   4. dm_custom_attributes     - Strongly-typed custom schema attributes
--   5. dm_metadata_values       - Indexed parametric key-value metadata store
--   6. dm_custom_identifiers    - Pattern-based sequence identifiers
--   7. dm_acl_entries           - Hierarchical object-level allow/deny ACL
--   8. dm_shares                - Time-bounded secure link shares
--   9. dm_legal_holds           - Compliance litigation legal hold cases
--  10. dm_document_legal_holds  - Document legal hold freeze bindings
--  11. dm_signatures            - E-signatures with cryptographic hash seals
--  12. dm_entity_links          - ERP entity cross-links (GL, AP, AR, Fleet, HR)
--  13. dm_embeddings            - Deterministic 256-dim FNV-1a vector embeddings
--  14. dm_document_events       - Domain event store
--  15. dm_quotas                - Tenant storage and document count quotas
--  16. dm_ingest_jobs           - Ingestion, OCR & processing pipeline queue
--  17. dm_settings              - Tenant DMS storage, scanner & AI settings
--  18. dm_workflow_templates    - Multi-step DAG/sequence workflow templates
--  19. dm_workflow_instances    - Running instances with immutable template snapshot
--  20. dm_workflow_tasks        - Parallel/sequential tasks with escalation sweep
--  21. dm_annotations           - Page and coordinate-based visual annotations
--  22. dm_outbox                - Transactional outbox for reliable async events
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Collections
-- ---------------------------------------------------------------------------
CREATE TABLE dm_collections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid REFERENCES core_accounting_units(id),
 name varchar(150) NOT NULL CHECK (btrim(name) <> ''),
 description text NOT NULL DEFAULT '',
 color varchar(30) NOT NULL DEFAULT '',
 icon varchar(50) NOT NULL DEFAULT 'collection',
 is_public boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_collections_name
 ON dm_collections(tenant_id, lower(name))
 WHERE is_deleted = false;

CREATE INDEX ix_dm_collections_tenant ON dm_collections(tenant_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 2. Tags
-- ---------------------------------------------------------------------------
CREATE TABLE dm_tags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 name varchar(60) NOT NULL CHECK (btrim(name) <> ''),
 color varchar(30) NOT NULL DEFAULT '#6366f1',
 category varchar(50) NOT NULL DEFAULT 'general',
 usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_tags_name
 ON dm_tags(tenant_id, lower(name))
 WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 3. Document Tags
-- ---------------------------------------------------------------------------
CREATE TABLE dm_document_tags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid NOT NULL REFERENCES dm_documents(id),
 tag_id uuid NOT NULL REFERENCES dm_tags(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_document_tags_pair
 ON dm_document_tags(tenant_id, document_id, tag_id)
 WHERE is_deleted = false;

CREATE INDEX ix_dm_document_tags_doc ON dm_document_tags(tenant_id, document_id) WHERE is_deleted = false;
CREATE INDEX ix_dm_document_tags_tag ON dm_document_tags(tenant_id, tag_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 4. Custom Attributes Schema
-- ---------------------------------------------------------------------------
CREATE TABLE dm_custom_attributes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 template_id uuid REFERENCES dm_templates(id),
 attribute_key varchar(80) NOT NULL CHECK (btrim(attribute_key) <> ''),
 label varchar(120) NOT NULL CHECK (btrim(label) <> ''),
 data_type varchar(30) NOT NULL DEFAULT 'string'
  CHECK (data_type IN ('string', 'number', 'date', 'boolean', 'select', 'json')),
 is_required boolean NOT NULL DEFAULT false,
 default_value text NOT NULL DEFAULT '',
 options jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(options) = 'array'),
 validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(validation_rules) = 'object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_custom_attributes_key
 ON dm_custom_attributes(tenant_id, COALESCE(template_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(attribute_key))
 WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 5. Metadata Values Key-Value Store
-- ---------------------------------------------------------------------------
CREATE TABLE dm_metadata_values (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid NOT NULL REFERENCES dm_documents(id),
 attribute_id uuid REFERENCES dm_custom_attributes(id),
 attribute_key varchar(80) NOT NULL CHECK (btrim(attribute_key) <> ''),
 string_value text NOT NULL DEFAULT '',
 number_value numeric,
 date_value timestamptz,
 boolean_value boolean,
 json_value jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_metadata_values_doc_key
 ON dm_metadata_values(tenant_id, document_id, lower(attribute_key))
 WHERE is_deleted = false;

CREATE INDEX ix_dm_metadata_values_doc ON dm_metadata_values(tenant_id, document_id) WHERE is_deleted = false;
CREATE INDEX ix_dm_metadata_values_key ON dm_metadata_values(tenant_id, lower(attribute_key)) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 6. Custom Identifiers
-- ---------------------------------------------------------------------------
CREATE TABLE dm_custom_identifiers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid REFERENCES core_accounting_units(id),
 name varchar(120) NOT NULL CHECK (btrim(name) <> ''),
 pattern varchar(100) NOT NULL DEFAULT '{PREFIX}-{YEAR}-{SEQ}',
 prefix varchar(30) NOT NULL DEFAULT 'DOC',
 suffix varchar(30) NOT NULL DEFAULT '',
 next_seq integer NOT NULL DEFAULT 1 CHECK (next_seq > 0),
 padding smallint NOT NULL DEFAULT 5 CHECK (padding BETWEEN 0 AND 12),
 reset_cycle varchar(20) NOT NULL DEFAULT 'none' CHECK (reset_cycle IN ('none', 'yearly', 'monthly')),
 last_reset_year integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_custom_identifiers_name
 ON dm_custom_identifiers(tenant_id, lower(name))
 WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 7. ACL Entries (Allow/Deny with Hierarchy Inheritance)
-- ---------------------------------------------------------------------------
CREATE TABLE dm_acl_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 entity_type varchar(30) NOT NULL CHECK (entity_type IN ('document', 'folder', 'collection')),
 entity_id uuid NOT NULL,
 principal_type varchar(30) NOT NULL CHECK (principal_type IN ('user', 'role', 'group', 'all')),
 principal_id varchar(80) NOT NULL CHECK (btrim(principal_id) <> ''),
 permission varchar(30) NOT NULL CHECK (permission IN ('read', 'write', 'delete', 'share', 'sign', 'admin')),
 access_type varchar(10) NOT NULL DEFAULT 'allow' CHECK (access_type IN ('allow', 'deny')),
 is_inherited boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_acl_entries_rule
 ON dm_acl_entries(tenant_id, entity_type, entity_id, principal_type, principal_id, permission)
 WHERE is_deleted = false;

CREATE INDEX ix_dm_acl_entries_entity ON dm_acl_entries(tenant_id, entity_type, entity_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 8. Shares (Time-bounded Secure Sharing)
-- ---------------------------------------------------------------------------
CREATE TABLE dm_shares (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid NOT NULL REFERENCES dm_documents(id),
 share_token varchar(80) NOT NULL CHECK (btrim(share_token) <> ''),
 recipient_email varchar(150) NOT NULL DEFAULT '',
 password_hash varchar(255) NOT NULL DEFAULT '',
 can_download boolean NOT NULL DEFAULT true,
 can_comment boolean NOT NULL DEFAULT false,
 expires_at timestamptz,
 max_access_count integer NOT NULL DEFAULT 0 CHECK (max_access_count >= 0),
 access_count integer NOT NULL DEFAULT 0 CHECK (access_count >= 0),
 is_revoked boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_shares_token
 ON dm_shares(tenant_id, share_token)
 WHERE is_deleted = false;

CREATE INDEX ix_dm_shares_doc ON dm_shares(tenant_id, document_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 9. Legal Holds (Compliance Litigation Cases)
-- ---------------------------------------------------------------------------
CREATE TABLE dm_legal_holds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 matter_number varchar(80) NOT NULL CHECK (btrim(matter_number) <> ''),
 title varchar(200) NOT NULL CHECK (btrim(title) <> ''),
 description text NOT NULL DEFAULT '',
 custodian_name varchar(150) NOT NULL DEFAULT '',
 status varchar(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
 applied_at timestamptz NOT NULL DEFAULT now(),
 released_at timestamptz,
 released_by_user_id uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_legal_holds_matter
 ON dm_legal_holds(tenant_id, lower(matter_number))
 WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 10. Document Legal Holds
-- ---------------------------------------------------------------------------
CREATE TABLE dm_document_legal_holds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid NOT NULL REFERENCES dm_documents(id),
 legal_hold_id uuid NOT NULL REFERENCES dm_legal_holds(id),
 notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_doc_legal_holds_pair
 ON dm_document_legal_holds(tenant_id, document_id, legal_hold_id)
 WHERE is_deleted = false;

CREATE INDEX ix_dm_doc_legal_holds_doc ON dm_document_legal_holds(tenant_id, document_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 11. E-Signatures
-- ---------------------------------------------------------------------------
CREATE TABLE dm_signatures (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid NOT NULL REFERENCES dm_documents(id),
 version_id uuid REFERENCES dm_document_versions(id),
 signer_user_id uuid REFERENCES users(id),
 signer_name varchar(150) NOT NULL DEFAULT '',
 signer_email varchar(150) NOT NULL DEFAULT '',
 signature_type varchar(30) NOT NULL DEFAULT 'electronic'
  CHECK (signature_type IN ('electronic', 'cryptographic', 'stamp')),
 status varchar(30) NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'signed', 'declined', 'revoked')),
 certificate_thumbprint varchar(128) NOT NULL DEFAULT '',
 signature_hash varchar(128) NOT NULL DEFAULT '',
 ip_address varchar(60) NOT NULL DEFAULT '',
 signed_at timestamptz,
 notes text NOT NULL DEFAULT '' ,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_signatures_doc_signer
 ON dm_signatures(tenant_id, document_id, COALESCE(signer_user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(signer_email))
 WHERE is_deleted = false;

CREATE INDEX ix_dm_signatures_doc ON dm_signatures(tenant_id, document_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 12. ERP Entity Links
-- ---------------------------------------------------------------------------
CREATE TABLE dm_entity_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid NOT NULL REFERENCES dm_documents(id),
 entity_type varchar(60) NOT NULL CHECK (btrim(entity_type) <> ''),
 entity_id uuid NOT NULL,
 reference_number varchar(100) NOT NULL DEFAULT '',
 link_category varchar(50) NOT NULL DEFAULT 'attachment',
 notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_entity_links_pair
 ON dm_entity_links(tenant_id, document_id, entity_type, entity_id)
 WHERE is_deleted = false;

CREATE INDEX ix_dm_entity_links_entity ON dm_entity_links(tenant_id, entity_type, entity_id) WHERE is_deleted = false;
CREATE INDEX ix_dm_entity_links_doc ON dm_entity_links(tenant_id, document_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 13. Embeddings (256-dim deterministic FNV-1a vectors)
-- ---------------------------------------------------------------------------
CREATE TABLE dm_embeddings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid NOT NULL REFERENCES dm_documents(id),
 version_id uuid REFERENCES dm_document_versions(id),
 chunk_index integer NOT NULL DEFAULT 0 CHECK (chunk_index >= 0),
 chunk_text text NOT NULL,
 token_count integer NOT NULL DEFAULT 0 CHECK (token_count >= 0),
 embedding_dim smallint NOT NULL DEFAULT 256 CHECK (embedding_dim = 256),
 vector_data jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(vector_data) = 'array'),
 hash_algorithm varchar(30) NOT NULL DEFAULT 'fnv1a-256',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_embeddings_doc_chunk
 ON dm_embeddings(tenant_id, document_id, chunk_index)
 WHERE is_deleted = false;

CREATE INDEX ix_dm_embeddings_doc ON dm_embeddings(tenant_id, document_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 14. Document Events Store
-- ---------------------------------------------------------------------------
CREATE TABLE dm_document_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid REFERENCES dm_documents(id),
 event_name varchar(80) NOT NULL CHECK (btrim(event_name) <> ''),
 event_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(event_payload) = 'object'),
 actor_id uuid REFERENCES users(id),
 is_processed boolean NOT NULL DEFAULT false,
 processed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX ix_dm_document_events_tenant ON dm_document_events(tenant_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 15. Quotas
-- ---------------------------------------------------------------------------
CREATE TABLE dm_quotas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 max_storage_bytes bigint NOT NULL DEFAULT 5368709120 CHECK (max_storage_bytes > 0),
 used_storage_bytes bigint NOT NULL DEFAULT 0 CHECK (used_storage_bytes >= 0),
 max_documents integer NOT NULL DEFAULT 50000 CHECK (max_documents > 0),
 document_count integer NOT NULL DEFAULT 0 CHECK (document_count >= 0),
 max_file_size_bytes bigint NOT NULL DEFAULT 104857600 CHECK (max_file_size_bytes > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_quotas_tenant
 ON dm_quotas(tenant_id)
 WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 16. Ingest Jobs
-- ---------------------------------------------------------------------------
CREATE TABLE dm_ingest_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 job_type varchar(40) NOT NULL DEFAULT 'file_ingest'
  CHECK (job_type IN ('file_ingest', 'bulk_zip', 'ocr_scan', 'pii_scan', 'reindex')),
 status varchar(30) NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
 source_name varchar(255) NOT NULL DEFAULT '',
 total_items integer NOT NULL DEFAULT 0 CHECK (total_items >= 0),
 processed_items integer NOT NULL DEFAULT 0 CHECK (processed_items >= 0),
 failed_items integer NOT NULL DEFAULT 0 CHECK (failed_items >= 0),
 error_details text NOT NULL DEFAULT '',
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
 started_at timestamptz,
 completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX ix_dm_ingest_jobs_status ON dm_ingest_jobs(tenant_id, status) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 17. Settings
-- ---------------------------------------------------------------------------
CREATE TABLE dm_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 storage_provider varchar(30) NOT NULL DEFAULT 'local'
  CHECK (storage_provider IN ('local', 'cloudinary', 's3')),
 storage_config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(storage_config) = 'object'),
 clamav_enabled boolean NOT NULL DEFAULT false,
 clamav_host varchar(120) NOT NULL DEFAULT '127.0.0.1',
 clamav_port integer NOT NULL DEFAULT 3310 CHECK (clamav_port BETWEEN 1 AND 65535),
 pii_detection_enabled boolean NOT NULL DEFAULT true,
 ocr_enabled boolean NOT NULL DEFAULT false,
 ocr_language varchar(20) NOT NULL DEFAULT 'eng',
 ai_classification_enabled boolean NOT NULL DEFAULT true,
 ai_rag_enabled boolean NOT NULL DEFAULT true,
 default_retention_days integer NOT NULL DEFAULT 365 CHECK (default_retention_days >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_settings_tenant
 ON dm_settings(tenant_id)
 WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 18. Workflow Templates
-- ---------------------------------------------------------------------------
CREATE TABLE dm_workflow_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 name varchar(150) NOT NULL CHECK (btrim(name) <> ''),
 description text NOT NULL DEFAULT '',
 trigger_type varchar(40) NOT NULL DEFAULT 'manual'
  CHECK (trigger_type IN ('manual', 'on_upload', 'on_status')),
 steps jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(steps) = 'array'),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_workflow_templates_name
 ON dm_workflow_templates(tenant_id, lower(name))
 WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 19. Workflow Instances
-- ---------------------------------------------------------------------------
CREATE TABLE dm_workflow_instances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 template_id uuid REFERENCES dm_workflow_templates(id),
 document_id uuid NOT NULL REFERENCES dm_documents(id),
 template_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(template_snapshot) = 'object'),
 current_step_index integer NOT NULL DEFAULT 0 CHECK (current_step_index >= 0),
 status varchar(30) NOT NULL DEFAULT 'running'
  CHECK (status IN ('running', 'completed', 'rejected', 'cancelled')),
 context_data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(context_data) = 'object'),
 started_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX ix_dm_workflow_instances_doc ON dm_workflow_instances(tenant_id, document_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 20. Workflow Tasks
-- ---------------------------------------------------------------------------
CREATE TABLE dm_workflow_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 instance_id uuid NOT NULL REFERENCES dm_workflow_instances(id),
 step_index integer NOT NULL DEFAULT 0 CHECK (step_index >= 0),
 step_name varchar(120) NOT NULL CHECK (btrim(step_name) <> ''),
 task_type varchar(30) NOT NULL DEFAULT 'approval'
  CHECK (task_type IN ('approval', 'review', 'sign', 'input')),
 execution_mode varchar(20) NOT NULL DEFAULT 'sequential'
  CHECK (execution_mode IN ('sequential', 'parallel')),
 assigned_role varchar(60) NOT NULL DEFAULT '',
 assigned_user_id uuid REFERENCES users(id),
 status varchar(30) NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected', 'skipped', 'escalated')),
 due_date timestamptz,
 escalation_hours integer NOT NULL DEFAULT 0 CHECK (escalation_hours >= 0),
 escalated_to_user_id uuid REFERENCES users(id),
 action_taken_by_user_id uuid REFERENCES users(id),
 decision_comment text NOT NULL DEFAULT '',
 completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX ix_dm_workflow_tasks_instance ON dm_workflow_tasks(tenant_id, instance_id) WHERE is_deleted = false;
CREATE INDEX ix_dm_workflow_tasks_status ON dm_workflow_tasks(tenant_id, status) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 21. Annotations (Visual page and coordinate annotations)
-- ---------------------------------------------------------------------------
CREATE TABLE dm_annotations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid NOT NULL REFERENCES dm_documents(id),
 version_id uuid REFERENCES dm_document_versions(id),
 page_number integer NOT NULL DEFAULT 1 CHECK (page_number >= 1),
 annotation_type varchar(30) NOT NULL DEFAULT 'highlight'
  CHECK (annotation_type IN ('highlight', 'rect', 'note', 'point', 'redaction')),
 rect_x numeric NOT NULL DEFAULT 0,
 rect_y numeric NOT NULL DEFAULT 0,
 rect_w numeric NOT NULL DEFAULT 0,
 rect_h numeric NOT NULL DEFAULT 0,
 color varchar(30) NOT NULL DEFAULT '#ffeb3b',
 content text NOT NULL DEFAULT '',
 is_resolved boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX ix_dm_annotations_doc ON dm_annotations(tenant_id, document_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 22. Transactional Outbox
-- ---------------------------------------------------------------------------
CREATE TABLE dm_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 event_type varchar(80) NOT NULL CHECK (btrim(event_type) <> ''),
 payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
 destination varchar(80) NOT NULL DEFAULT 'dms.events',
 status varchar(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'failed')),
 retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
 next_retry_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 dispatched_at timestamptz,
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX ix_dm_outbox_pending ON dm_outbox(tenant_id, status, next_retry_at) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 23. Alter dm_audit_events for SHA-256 tamper-evident hash chaining
-- ---------------------------------------------------------------------------
ALTER TABLE dm_audit_events
 ADD COLUMN IF NOT EXISTS prev_hash varchar(64) NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS curr_hash varchar(64) NOT NULL DEFAULT '';

-- ---------------------------------------------------------------------------
-- 24. Register all enterprise tables in core_tenant_reset_registry
-- ---------------------------------------------------------------------------
INSERT INTO core_tenant_reset_registry(table_name, module, reset_group) VALUES
 ('dm_collections', 'Document Management', ''),
 ('dm_tags', 'Document Management', ''),
 ('dm_document_tags', 'Document Management', 'financial'),
 ('dm_custom_attributes', 'Document Management', ''),
 ('dm_metadata_values', 'Document Management', 'financial'),
 ('dm_custom_identifiers', 'Document Management', ''),
 ('dm_acl_entries', 'Document Management', ''),
 ('dm_shares', 'Document Management', 'financial'),
 ('dm_legal_holds', 'Document Management', ''),
 ('dm_document_legal_holds', 'Document Management', 'financial'),
 ('dm_signatures', 'Document Management', 'financial'),
 ('dm_entity_links', 'Document Management', 'financial'),
 ('dm_embeddings', 'Document Management', 'financial'),
 ('dm_document_events', 'Document Management', 'financial'),
 ('dm_quotas', 'Document Management', ''),
 ('dm_ingest_jobs', 'Document Management', ''),
 ('dm_settings', 'Document Management', ''),
 ('dm_workflow_templates', 'Document Management', ''),
 ('dm_workflow_instances', 'Document Management', 'financial'),
 ('dm_workflow_tasks', 'Document Management', 'financial'),
 ('dm_annotations', 'Document Management', 'financial'),
 ('dm_outbox', 'Document Management', 'financial');

COMMIT;
