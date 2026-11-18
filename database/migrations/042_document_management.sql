BEGIN;

-- ===========================================================================
-- Document Management Module Schema (LogicalDOC features reference)
-- Tables:
--   1. dm_document_sequences   - Per-unit numbering for documents and folders
--   2. dm_folders              - Hierarchical folder tree with path & permissions
--   3. dm_templates            - Document types/templates with custom metadata schema
--   4. dm_retention_policies   - Retention & disposition compliance policies
--   5. dm_documents            - Document records with metadata, status & lock
--   6. dm_document_versions    - Immutable version history & file revisions
--   7. dm_workflows            - Review & approval workflow state machine
--   8. dm_document_relations   - Cross-document links and associations
--   9. dm_document_notes       - Collaboration notes & comments
--  10. dm_bookmarks            - User favorites / bookmarked documents
--  11. dm_saved_searches       - Saved search criteria & filters
--  12. dm_audit_events         - Complete immutable audit trail log
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Document Sequences
-- ---------------------------------------------------------------------------
CREATE TABLE dm_document_sequences (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid REFERENCES core_accounting_units(id),
 sequence_type varchar(40) NOT NULL CHECK (sequence_type IN ('DOC','FLDR')),
 prefix varchar(20) NOT NULL DEFAULT 'DOC-',
 next_number integer NOT NULL DEFAULT 1 CHECK (next_number > 0),
 padding smallint NOT NULL DEFAULT 4 CHECK (padding BETWEEN 0 AND 12),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_document_sequences_scope
 ON dm_document_sequences(tenant_id, COALESCE(accounting_unit_id, '00000000-0000-0000-0000-000000000000'::uuid), sequence_type)
 WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 2. Folders (Hierarchical taxonomy tree)
-- ---------------------------------------------------------------------------
CREATE TABLE dm_folders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid REFERENCES core_accounting_units(id),
 parent_id uuid REFERENCES dm_folders(id),
 name varchar(150) NOT NULL CHECK (btrim(name) <> ''),
 description text NOT NULL DEFAULT '',
 color varchar(30) NOT NULL DEFAULT '',
 icon varchar(50) NOT NULL DEFAULT 'folder',
 path text NOT NULL DEFAULT '/',
 is_system boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_folders_name_parent
 ON dm_folders(tenant_id, COALESCE(accounting_unit_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
 WHERE is_deleted = false;

CREATE INDEX ix_dm_folders_parent ON dm_folders(tenant_id, parent_id) WHERE is_deleted = false;
CREATE INDEX ix_dm_folders_unit ON dm_folders(tenant_id, accounting_unit_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 3. Retention Policies
-- ---------------------------------------------------------------------------
CREATE TABLE dm_retention_policies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid REFERENCES core_accounting_units(id),
 name varchar(120) NOT NULL CHECK (btrim(name) <> ''),
 description text NOT NULL DEFAULT '',
 retention_days integer NOT NULL DEFAULT 365 CHECK (retention_days >= 0),
 disposition_action varchar(30) NOT NULL DEFAULT 'archive'
  CHECK (disposition_action IN ('archive', 'review', 'dispose')),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_retention_policies_name
 ON dm_retention_policies(tenant_id, lower(name))
 WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 4. Document Templates (Document Types & Custom Metadata Schemas)
-- ---------------------------------------------------------------------------
CREATE TABLE dm_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid REFERENCES core_accounting_units(id),
 name varchar(120) NOT NULL CHECK (btrim(name) <> ''),
 code varchar(50) NOT NULL CHECK (btrim(code) <> ''),
 description text NOT NULL DEFAULT '',
 schema jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(schema) = 'array'),
 default_retention_policy_id uuid REFERENCES dm_retention_policies(id),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_templates_code
 ON dm_templates(tenant_id, lower(code))
 WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 5. Documents
-- ---------------------------------------------------------------------------
CREATE TABLE dm_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 folder_id uuid REFERENCES dm_folders(id),
 template_id uuid REFERENCES dm_templates(id),
 document_number varchar(80) NOT NULL CHECK (btrim(document_number) <> ''),
 title varchar(255) NOT NULL CHECK (btrim(title) <> ''),
 file_name varchar(255) NOT NULL CHECK (btrim(file_name) <> ''),
 description text NOT NULL DEFAULT '',
 language varchar(10) NOT NULL DEFAULT 'en',
 mime_type varchar(120) NOT NULL DEFAULT 'application/octet-stream',
 file_size bigint NOT NULL DEFAULT 0 CHECK (file_size >= 0),
 file_hash varchar(128) NOT NULL DEFAULT '',
 content_text text NOT NULL DEFAULT '',
 storage_path text NOT NULL DEFAULT '',
 version_label varchar(30) NOT NULL DEFAULT '1.0',
 status varchar(30) NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'published', 'archived')),
 is_checked_out boolean NOT NULL DEFAULT false,
 checked_out_by_user_id uuid REFERENCES users(id),
 checked_out_at timestamptz,
 is_locked boolean NOT NULL DEFAULT false,
 locked_by_user_id uuid REFERENCES users(id),
 locked_at timestamptz,
 tags jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(tags) = 'array'),
 attributes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
 retention_policy_id uuid REFERENCES dm_retention_policies(id),
 retention_date timestamptz,
 is_expired boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_documents_number
 ON dm_documents(tenant_id, lower(document_number))
 WHERE is_deleted = false;

CREATE INDEX ix_dm_documents_unit ON dm_documents(tenant_id, accounting_unit_id) WHERE is_deleted = false;
CREATE INDEX ix_dm_documents_folder ON dm_documents(tenant_id, folder_id) WHERE is_deleted = false;
CREATE INDEX ix_dm_documents_status ON dm_documents(tenant_id, status) WHERE is_deleted = false;
CREATE INDEX ix_dm_documents_template ON dm_documents(tenant_id, template_id) WHERE is_deleted = false;
CREATE INDEX ix_dm_documents_checkout ON dm_documents(tenant_id, checked_out_by_user_id) WHERE is_deleted = false AND is_checked_out = true;

-- ---------------------------------------------------------------------------
-- 6. Document Versions (Version Control & Revisions)
-- ---------------------------------------------------------------------------
CREATE TABLE dm_document_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid NOT NULL REFERENCES dm_documents(id),
 version_label varchar(30) NOT NULL CHECK (btrim(version_label) <> ''),
 file_name varchar(255) NOT NULL CHECK (btrim(file_name) <> ''),
 file_size bigint NOT NULL DEFAULT 0 CHECK (file_size >= 0),
 file_hash varchar(128) NOT NULL DEFAULT '',
 mime_type varchar(120) NOT NULL DEFAULT 'application/octet-stream',
 comment text NOT NULL DEFAULT '',
 content_text text NOT NULL DEFAULT '',
 storage_path text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_document_versions_label
 ON dm_document_versions(tenant_id, document_id, version_label)
 WHERE is_deleted = false;

CREATE INDEX ix_dm_document_versions_doc ON dm_document_versions(tenant_id, document_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 7. Workflows & Approvals (Review tasks & status history)
-- ---------------------------------------------------------------------------
CREATE TABLE dm_workflows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid NOT NULL REFERENCES dm_documents(id),
 step_name varchar(80) NOT NULL DEFAULT 'Review & Approval',
 status varchar(30) NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
 assigned_to_user_id uuid REFERENCES users(id),
 decided_by_user_id uuid REFERENCES users(id),
 decided_at timestamptz,
 comments text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX ix_dm_workflows_doc ON dm_workflows(tenant_id, document_id) WHERE is_deleted = false;
CREATE INDEX ix_dm_workflows_status ON dm_workflows(tenant_id, status) WHERE is_deleted = false;
CREATE INDEX ix_dm_workflows_assignee ON dm_workflows(tenant_id, assigned_to_user_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 8. Document Relations (Links between related records)
-- ---------------------------------------------------------------------------
CREATE TABLE dm_document_relations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 source_document_id uuid NOT NULL REFERENCES dm_documents(id),
 target_document_id uuid NOT NULL REFERENCES dm_documents(id),
 relation_type varchar(40) NOT NULL DEFAULT 'relates_to'
  CHECK (relation_type IN ('relates_to', 'supersedes', 'supports', 'amends')),
 notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_document_relations_pair
 ON dm_document_relations(tenant_id, source_document_id, target_document_id, relation_type)
 WHERE is_deleted = false;

CREATE INDEX ix_dm_document_relations_source ON dm_document_relations(tenant_id, source_document_id) WHERE is_deleted = false;
CREATE INDEX ix_dm_document_relations_target ON dm_document_relations(tenant_id, target_document_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 9. Document Notes (Collaboration & Discussions)
-- ---------------------------------------------------------------------------
CREATE TABLE dm_document_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid NOT NULL REFERENCES dm_documents(id),
 user_id uuid NOT NULL REFERENCES users(id),
 note_text text NOT NULL CHECK (btrim(note_text) <> ''),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX ix_dm_document_notes_doc ON dm_document_notes(tenant_id, document_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 10. Bookmarks / Favorites
-- ---------------------------------------------------------------------------
CREATE TABLE dm_bookmarks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 user_id uuid NOT NULL REFERENCES users(id),
 document_id uuid NOT NULL REFERENCES dm_documents(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_bookmarks_user_doc
 ON dm_bookmarks(tenant_id, user_id, document_id)
 WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 11. Saved Searches
-- ---------------------------------------------------------------------------
CREATE TABLE dm_saved_searches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 user_id uuid NOT NULL REFERENCES users(id),
 name varchar(120) NOT NULL CHECK (btrim(name) <> ''),
 description text NOT NULL DEFAULT '',
 criteria jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(criteria) = 'object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE UNIQUE INDEX uq_dm_saved_searches_user_name
 ON dm_saved_searches(tenant_id, user_id, lower(name))
 WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 12. Audit Events (Immutable audit trail log)
-- ---------------------------------------------------------------------------
CREATE TABLE dm_audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid REFERENCES dm_documents(id),
 folder_id uuid REFERENCES dm_folders(id),
 event_type varchar(50) NOT NULL CHECK (btrim(event_type) <> ''),
 user_id uuid NOT NULL REFERENCES users(id),
 user_name varchar(120) NOT NULL DEFAULT '',
 details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
 ip_address varchar(60) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE INDEX ix_dm_audit_events_doc ON dm_audit_events(tenant_id, document_id);
CREATE INDEX ix_dm_audit_events_time ON dm_audit_events(tenant_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 13. Register every Document Management tenant-scoped table in reset registry
-- ---------------------------------------------------------------------------
INSERT INTO core_tenant_reset_registry(table_name, module, reset_group) VALUES
 ('dm_document_sequences', 'Document Management', ''),
 ('dm_folders', 'Document Management', ''),
 ('dm_retention_policies', 'Document Management', ''),
 ('dm_templates', 'Document Management', ''),
 ('dm_documents', 'Document Management', 'financial'),
 ('dm_document_versions', 'Document Management', 'financial'),
 ('dm_workflows', 'Document Management', 'financial'),
 ('dm_document_relations', 'Document Management', 'financial'),
 ('dm_document_notes', 'Document Management', 'financial'),
 ('dm_bookmarks', 'Document Management', 'financial'),
 ('dm_saved_searches', 'Document Management', ''),
 ('dm_audit_events', 'Document Management', 'financial');

COMMIT;
