BEGIN;
ALTER TABLE gl_journal_batches ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
-- NULL means no idempotency key, not a shared key for every draft in a unit.
ALTER TABLE gl_journal_batches DROP CONSTRAINT uq_gl_journal_batches_idempotency;
ALTER TABLE gl_journal_batches ADD CONSTRAINT uq_gl_journal_batches_idempotency UNIQUE(tenant_id,accounting_unit_id,idempotency_key);
ALTER TABLE gl_journal_lines ADD COLUMN line_number integer CHECK(line_number>0);
WITH ordered AS (
 SELECT id,row_number() OVER(PARTITION BY tenant_id,accounting_unit_id,journal_batch_id ORDER BY created_at,id)::integer AS position
 FROM gl_journal_lines WHERE is_deleted=false
)
UPDATE gl_journal_lines l SET line_number=o.position FROM ordered o WHERE l.id=o.id AND l.is_deleted=false;
CREATE UNIQUE INDEX uq_gl_journal_lines_live_position ON gl_journal_lines(tenant_id,accounting_unit_id,journal_batch_id,line_number) WHERE is_deleted=false;
COMMIT;
