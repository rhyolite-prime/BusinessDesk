# Document Management workspace

Enterprise document management system (EDMS) adhering to the LogicalDOC feature
specification: hierarchical folder taxonomy with breadcrumbs, template-driven
custom metadata schemas (text, number, date, boolean, select), full version
control with check-in/check-out locking and version history, fast full-text and
parametric search, saved queries and bookmarks, multi-step review and approval
workflows, cross-document relations, collaboration notes, compliance retention
policies with disposition lifecycles, recycle bin (trash) with restore and
purge, and a tamper-evident audit trail log.

## 1. Deploy the database upgrade first

Apply **migration 042** (not `.down.sql`):

```sh
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f database/migrations/042_document_management.sql
```

The backend does not run schema DDL on startup or per request. Missing
tables return `schema_not_ready` / 503 with a pointer to `042_document_management.sql`.
The down migration (`042_document_management.down.sql`) cleanly drops all 12 tables
and clears reset registry entries.

## 2. Schema summary (`12` `dm_*` tables)

| Domain | Table | Invariants & Description |
| --- | --- | --- |
| Numbering | `dm_document_sequences` | Per-tenant/unit document numbering (`DOC-0001`, `FLDR-0001`). Single-column FKs. |
| Taxonomy | `dm_folders` | Self-referencing tree (`parent_id`), path computation, duplicate name prevention under same parent. |
| Templates | `dm_templates` | Document types/templates with configurable JSON schema custom fields. |
| Retention | `dm_retention_policies` | Statutory retention durations and disposition actions (`archive`, `review`, `dispose`). |
| Documents | `dm_documents` | Document records with status lifecycle, check-out/lock guards, tags, attributes. |
| Versioning | `dm_document_versions` | Revisions with version labels (`1.0`, `1.1`, `2.0`), file metadata, changelog comments. |
| Workflows | `dm_workflows` | Review & approval state machine (`pending`, `approved`, `rejected`, `cancelled`). |
| Collaboration | `dm_document_relations` | Cross-document links (`relates_to`, `supersedes`, `supports`, `amends`). |
| Discussions | `dm_document_notes` | Threaded collaboration comments and discussion notes. |
| Favorites | `dm_bookmarks` | Per-user document bookmarks. |
| Search | `dm_saved_searches` | Per-user saved parametric queries. |
| Audit | `dm_audit_events` | Immutable audit trail of every access, edit, workflow decision, and status transition. |

All tables carry single-column UUID primary keys (`id`), single-column foreign keys
for Drogon C++ ORM compatibility, `version` optimistic locking, `is_deleted` soft
deletion, audit columns, and registration in `core_tenant_reset_registry` under
`'Document Management'`.

## 3. Routes and authorization

All C++ endpoints live under `/api/v1/dm/**` in `controllers/DmController.{h,cc}`
behind `TenantJwtAuthFilter` and `inventory_internal::authorize(..., "dm", ...)`.
Tenant administrators and users with `dm.write`, `dm.manage`, or `*` have full
modification access; users with `dm.read` can view records. Responses include
`Cache-Control: no-store`.

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/v1/dm/dashboard/summary` | Live dashboard metrics, active checkouts, pending approvals, storage usage |
| GET | `/api/v1/dm/next-number` | Unreserved document sequence preview |
| GET / POST | `/api/v1/dm/folders` | List folder tree / create folder |
| GET / PUT / DELETE | `/api/v1/dm/folders/{id}` | Folder detail / update / soft delete |
| GET / POST | `/api/v1/dm/templates` | List metadata templates / create template |
| GET / PUT / DELETE | `/api/v1/dm/templates/{id}` | Template detail / update / soft delete |
| GET / POST | `/api/v1/dm/retention-policies` | List retention policies / create policy |
| GET / PUT / DELETE | `/api/v1/dm/retention-policies/{id}` | Policy detail / update / delete |
| GET / POST | `/api/v1/dm/documents` | Paged parametric & full-text search / upload document |
| GET / PUT / DELETE | `/api/v1/dm/documents/{id}` | Document inspection / metadata update / move to trash |
| POST | `/api/v1/dm/documents/{id}/checkout` | Check out document (locks document to user) |
| POST | `/api/v1/dm/documents/{id}/checkin` | Check in revision (major/minor version, changelog comment) |
| POST | `/api/v1/dm/documents/{id}/lock` | Lock document |
| POST | `/api/v1/dm/documents/{id}/unlock` | Unlock document |
| POST | `/api/v1/dm/documents/{id}/bookmark` | Toggle user bookmark |
| GET | `/api/v1/dm/documents/{id}/versions` | Version history list |
| POST | `/api/v1/dm/documents/{id}/versions/{versionId}/revert` | Revert to previous version |
| POST | `/api/v1/dm/documents/{id}/workflow/{submit\|approve\|reject\|cancel}` | Approval transitions |
| GET | `/api/v1/dm/workflows` | Review task queue |
| GET / POST | `/api/v1/dm/documents/{id}/notes` | List / add comments |
| GET / POST | `/api/v1/dm/documents/{id}/relations` | List / link related documents |
| DELETE | `/api/v1/dm/documents/{id}/relations/{relId}` | Remove document relation |
| GET / POST | `/api/v1/dm/saved-searches` | List / save search queries |
| DELETE | `/api/v1/dm/saved-searches/{id}` | Delete saved query |
| GET | `/api/v1/dm/trash` | Recycle bin (deleted documents & folders) |
| POST | `/api/v1/dm/trash/{id}/restore` | Restore from recycle bin |
| DELETE | `/api/v1/dm/trash/{id}` | Permanent purge |
| GET | `/api/v1/dm/audit` | Global audit trail log |

Same-origin Nuxt BFF routes mirror these under `/api/documents/**`.
The workspace UI lives under `/documents` (`explorer`, `search`, `approvals`,
`templates`, `retention`, `trash`, `audit`).
