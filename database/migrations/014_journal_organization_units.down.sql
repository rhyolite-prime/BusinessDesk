-- Compatibility rollback. Old independent cost-center values cannot be reconstructed.
-- Does not rewrite financial balances, snapshots, or deleted records.
BEGIN;
ALTER TABLE gl_journal_lines ADD COLUMN cost_center_id uuid;
UPDATE gl_journal_lines SET cost_center_id=organization_unit_id WHERE is_deleted=false;
COMMIT;
