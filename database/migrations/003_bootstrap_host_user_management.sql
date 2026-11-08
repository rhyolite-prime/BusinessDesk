-- Existing installations: grant the protected bootstrap role host-user CRUD.
-- Sign in again after applying this migration; JWT permissions are snapshots.
BEGIN;
UPDATE roles
SET permissions = COALESCE(permissions, '[]'::jsonb) || '["users.manage"]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE id = '00000000-0000-4000-8000-000000000003'
  AND tenant_id = '00000000-0000-4000-8000-000000000001'
  AND NOT (COALESCE(permissions, '[]'::jsonb) @> '["users.manage"]'::jsonb)
  AND EXISTS (
      SELECT 1 FROM tenants
      WHERE id = '00000000-0000-4000-8000-000000000001'
        AND is_deleted = false AND is_active = true
  );
COMMIT;
