-- Journal lines use the cost-center catalog as their organization-unit catalog.
-- Back up first and stop writes while deploying this schema/API change.
BEGIN;
LOCK TABLE gl_journal_lines IN ACCESS EXCLUSIVE MODE;
-- Never discard an archived-only dimension. Stop for operator review instead
-- of modifying soft-deleted lines or silently losing their original ID.
ALTER TABLE gl_journal_lines ADD CONSTRAINT journal_deleted_organization_preserved
 CHECK (is_deleted=false OR cost_center_id IS NULL OR cost_center_id IS NOT DISTINCT FROM organization_unit_id);
-- Refuse to silently discard conflicting legacy organizational assignments.
CREATE TEMP TABLE journal_organization_migration_guard (
 conflicts bigint CHECK (conflicts = 0)
) ON COMMIT DROP;
INSERT INTO journal_organization_migration_guard
SELECT count(*) FROM gl_journal_lines
WHERE is_deleted=false AND organization_unit_id IS NOT NULL
 AND cost_center_id IS NOT NULL AND organization_unit_id<>cost_center_id;
UPDATE gl_journal_lines l
SET organization_unit_id=COALESCE(l.cost_center_id,l.organization_unit_id),
 organization_unit_name=CASE WHEN c.id IS NOT NULL THEN c.name
  WHEN l.organization_unit_id=COALESCE(l.cost_center_id,l.organization_unit_id) THEN l.organization_unit_name
  ELSE NULL END
FROM (SELECT id,tenant_id,COALESCE(cost_center_id,organization_unit_id) AS unit_id
 FROM gl_journal_lines WHERE is_deleted=false) source
LEFT JOIN core_cost_centers c ON c.id=source.unit_id AND c.tenant_id=source.tenant_id AND c.is_deleted=false
WHERE l.id=source.id AND l.tenant_id=source.tenant_id AND l.is_deleted=false;
ALTER TABLE gl_journal_lines DROP CONSTRAINT journal_deleted_organization_preserved;
ALTER TABLE gl_journal_lines DROP COLUMN cost_center_id;
COMMIT;
