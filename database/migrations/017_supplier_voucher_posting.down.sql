BEGIN;
DELETE FROM core_tenant_reset_registry WHERE table_name='gl_supplier_voucher_sequences';
DROP TABLE gl_supplier_voucher_sequences;
DROP INDEX uq_payment_voucher_journal;
DROP INDEX uq_payment_voucher_request;
-- Keep corrected nullable-key semantics on downgrade; the legacy NULLS NOT DISTINCT
-- constraint cannot be restored safely after multiple real vouchers have been saved.
ALTER TABLE gl_payment_vouchers ADD CONSTRAINT uq_gl_payment_vouchers_idempotency UNIQUE(tenant_id,accounting_unit_id,idempotency_key);
ALTER TABLE gl_payment_vouchers DROP COLUMN version,DROP COLUMN source_payload,DROP COLUMN calculation,DROP COLUMN proposed_journal,DROP COLUMN posting_period_id,DROP COLUMN request_hash;
-- Retain new line audit/deletion columns: removing them would resurrect archived lines.
COMMIT;
