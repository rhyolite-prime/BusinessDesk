BEGIN;
DROP INDEX uq_gl_journal_lines_live_position;
ALTER TABLE gl_journal_lines DROP COLUMN line_number;
ALTER TABLE gl_journal_batches DROP COLUMN version;
ALTER TABLE gl_journal_batches DROP CONSTRAINT uq_gl_journal_batches_idempotency;
-- Fails transactionally if multiple null-key batches exist; never delete history.
ALTER TABLE gl_journal_batches ADD CONSTRAINT uq_gl_journal_batches_idempotency UNIQUE NULLS NOT DISTINCT(tenant_id,accounting_unit_id,idempotency_key);
COMMIT;
